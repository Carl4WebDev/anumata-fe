import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Check, Loader2, AlertCircle } from "lucide-react";
import { emotionApi } from "../../../shared/api/emotionApi";
import { getFiles, deleteFiles } from "../../../shared/utils/fileStorage";

const STAGES = [
  { key: "upload", label: "Uploading interview data" },
  { key: "extract", label: "Extracting audio from video" },
  { key: "stt", label: "Speech-to-Text transcription" },
  { key: "fer", label: "Facial Expression Recognition" },
  { key: "ser", label: "Speech Emotion Recognition" },
  { key: "ler", label: "Language Emotion Recognition" },
  { key: "fusion", label: "Multimodal Fusion" },
  { key: "summary", label: "Generating AI summary" },
  { key: "save", label: "Saving results" },
];

export default function ProcessingPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [currentStage, setCurrentStage] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState("");
  const [failedStage, setFailedStage] = useState<number | null>(null);
  const analyzingRef = useRef(false);

  useEffect(() => {
    if (!token) return;
    if (analyzingRef.current) return;
    analyzingRef.current = true;

    getFiles(token)
      .then((fileEntries) => {
        if (!fileEntries || fileEntries.length === 0) {
          setError("No interview data found. Please retake the interview.");
          return;
        }

        const files: File[] = fileEntries.map(
          (entry) => new File([entry.blob], entry.name, { type: entry.type })
        );

        // Animate stages while API runs
        let stageTimeout: ReturnType<typeof setTimeout>;
        const advance = (stage: number) => {
          if (stage >= STAGES.length) return;
          stageTimeout = setTimeout(() => {
            setCurrentStage(stage);
            advance(stage + 1);
          }, 2000);
        };
        advance(0);

        emotionApi
          .analyze(token, files)
          .then((result) => {
            clearTimeout(stageTimeout);
            setCurrentStage(STAGES.length);
            setCompleted(true);
            sessionStorage.setItem(`amumata_analysis_${token}`, JSON.stringify(result));
            deleteFiles(token).catch(() => {});
          })
          .catch((err) => {
            clearTimeout(stageTimeout);
            setFailedStage(currentStage);
            setError(err.message || "Analysis failed. Please try again.");
          });
      })
      .catch(() => {
        setError("Failed to load interview data. Please retake the interview.");
      });
  }, [token]);

  const handleViewResults = () => {
    navigate(`/interview/${token}/results`);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F1F5F9] px-4">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-md border border-slate-200">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-teal-100">
            {error ? (
              <AlertCircle size={32} className="text-red-500" />
            ) : completed ? (
              <Check size={32} className="text-green-600" />
            ) : (
              <Loader2 size={32} className="animate-spin text-teal-600" />
            )}
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            {error ? "Analysis Error" : completed ? "Analysis Complete" : "Analyzing Interview"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {error
              ? error
              : completed
                ? "The emotional pre-evaluation is ready."
                : "Processing through the multimodal AI pipeline..."}
          </p>
        </div>

        {!error && (
          <div className="space-y-3" role="list" aria-label="Processing stages">
            {STAGES.map((stage, i) => (
              <div key={stage.key} className="flex items-center gap-3" role="listitem">
                <div className="flex h-7 w-7 items-center justify-center rounded-full flex-shrink-0">
                  {i < currentStage ? (
                    <Check size={16} className="text-green-600" />
                  ) : i === currentStage && !completed ? (
                    <Loader2 size={16} className="animate-spin text-teal-600" />
                  ) : completed ? (
                    <Check size={16} className="text-green-600" />
                  ) : (
                    <div className="h-2 w-2 rounded-full bg-slate-300" />
                  )}
                </div>
                <span
                  className={`text-sm ${
                    i < currentStage || completed
                      ? "text-slate-500"
                      : i === currentStage
                        ? "font-medium text-slate-900"
                        : "text-slate-400"
                  }`}
                >
                  {stage.label}
                </span>
              </div>
            ))}
          </div>
        )}

        {error && failedStage !== null && (
          <div className="mt-4 rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-700">
            <p className="font-medium">Failed at: {STAGES[failedStage]?.label}</p>
            <p className="mt-1">{error}</p>
          </div>
        )}

        <div className="mt-8">
          {completed && (
            <button
              onClick={handleViewResults}
              className="w-full rounded-lg bg-teal-600 px-6 py-3 text-sm font-medium text-white hover:bg-teal-700 transition"
            >
              View Results
            </button>
          )}
          {error && (
            <button
              onClick={() => navigate(`/interview/${token}`)}
              className="w-full rounded-xl bg-slate-600 px-6 py-3 text-sm font-medium text-white hover:bg-slate-700 transition"
            >
              Retry Interview
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
