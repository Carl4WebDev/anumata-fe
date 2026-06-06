import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Check, Loader2 } from "lucide-react";
import { emotionApi } from "../../../shared/api/emotionApi";

const STEPS = [
  "Analyzing facial expressions",
  "Analyzing speech patterns",
  "Detecting emotional spikes",
  "Generating pre-evaluation summary",
];

export default function ProcessingPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;

    // Load files from sessionStorage (stored by InterviewRoomPage)
    const filesJson = sessionStorage.getItem(`amumata_files_${token}`);
    if (!filesJson) {
      setError("No interview data found. Please retake the interview.");
      return;
    }

    const fileDataUrls: { name: string; type: string; dataUrl: string }[] = JSON.parse(filesJson);

    // Convert data URLs back to File objects
    const files: File[] = fileDataUrls.map((fd) => {
      const byteString = atob(fd.dataUrl.split(",")[1]);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      return new File([ab], fd.name, { type: fd.type });
    });

    // Animate steps while API runs
    let stepTimeout: ReturnType<typeof setTimeout>;
    const advance = (step: number) => {
      if (step >= STEPS.length) return;
      stepTimeout = setTimeout(() => {
        setCurrentStep(step);
        advance(step + 1);
      }, 1500);
    };
    advance(0);

    // Run analysis
    emotionApi
      .analyze(token, files)
      .then((result) => {
        clearTimeout(stepTimeout);
        setCurrentStep(STEPS.length);
        setCompleted(true);

        // Store result for ResultsPage
        sessionStorage.setItem(`amumata_analysis_${token}`, JSON.stringify(result));

        // Clean up files from sessionStorage
        sessionStorage.removeItem(`amumata_files_${token}`);
      })
      .catch((err) => {
        clearTimeout(stepTimeout);
        setError(err.message || "Analysis failed. Please try again.");
      });

    return () => clearTimeout(stepTimeout);
  }, [token]);

  const handleViewResults = () => {
    navigate(`/interview/${token}/results`);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F1F5F9] px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-md border border-slate-200">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
            {error ? (
              <span className="text-2xl text-red-500">!</span>
            ) : completed ? (
              <Check size={32} className="text-green-600" />
            ) : (
              <Loader2 size={32} className="animate-spin text-blue-600" />
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
                : "Please wait while we process the interview data..."}
          </p>
        </div>

        {!error && (
          <div className="space-y-4">
            {STEPS.map((step, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full flex-shrink-0">
                  {i < currentStep ? (
                    <Check size={18} className="text-green-600" />
                  ) : i === currentStep && !completed ? (
                    <Loader2 size={18} className="animate-spin text-blue-600" />
                  ) : (
                    <div className="h-2 w-2 rounded-full bg-slate-300" />
                  )}
                </div>
                <span
                  className={`text-sm ${
                    i < currentStep
                      ? "text-slate-500 line-through"
                      : i === currentStep
                        ? "font-medium text-slate-900"
                        : "text-slate-400"
                  }`}
                >
                  {step}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8">
          {completed && (
            <button
              onClick={handleViewResults}
              className="w-full rounded-xl bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700 transition"
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
