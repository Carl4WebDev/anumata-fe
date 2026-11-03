import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Check, Loader2, AlertCircle, RotateCcw, WifiOff } from "lucide-react";
import {
  emotionApi,
  StagedFilesMissingError,
  type AnalysisStatus,
  type InterviewExtras,
} from "../../../shared/api/emotionApi";
import { getFiles, deleteFiles } from "../../../shared/utils/fileStorage";
import { clearStagedNames, splitStaged } from "../../../shared/utils/earlyUpload";
import { describeProgress, formatElapsed } from "../utils/analysisProgress";
import { usePeakEndProgress } from "../../../shared/hooks/usePeakEndProgress";
import AnalysisWorkList from "../components/AnalysisWorkList";

const POLL_MS = 3000;
// Brief network hiccups are normal while waiting minutes; only give up after this many in a row.
const MAX_POLL_FAILURES = 10;

type Phase = "uploading" | "analysing" | "completed" | "failed";

/** The answered questions, saved by the interview room. */
function readAnsweredQuestions(token: string | undefined): string[] {
  if (!token) return [];
  try {
    const saved = JSON.parse(sessionStorage.getItem(`amumata_result_${token}`) ?? "{}");
    const responses: unknown = saved.responses;
    return Array.isArray(responses) ? responses.map((r: { question?: unknown }) => String(r?.question ?? "")) : [];
  } catch {
    return [];
  }
}

/** The mood check and follow-ups asked, saved by the interview room, to send with the recordings. */
function readExtras(token: string): InterviewExtras {
  try {
    const saved = JSON.parse(sessionStorage.getItem(`amumata_result_${token}`) ?? "{}");
    return {
      selfReport: saved.selfReport ?? null,
      followUpsAsked: Array.isArray(saved.followUpsAsked) ? saved.followUpsAsked : [],
      feelingsTapped: saved.feelingsTapped && typeof saved.feelingsTapped === "object" ? saved.feelingsTapped : {},
      checkIns: saved.checkIns && typeof saved.checkIns === "object" ? saved.checkIns : {},
      skipped: Array.isArray(saved.skipped) ? saved.skipped : [],
    };
  } catch {
    return {};
  }
}

interface Received {
  photos: number;
  clips: number;
}

export default function ProcessingPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("uploading");
  const [status, setStatus] = useState<AnalysisStatus | null>(null);
  const [error, setError] = useState("");
  const [reconnecting, setReconnecting] = useState(false);
  const [canRetry, setCanRetry] = useState(true);
  const [questions] = useState(() => readAnsweredQuestions(token));
  const [received, setReceived] = useState<Received | null>(null);
  const startedRef = useRef(false);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const failuresRef = useRef(0);

  const stopPolling = () => {
    if (pollRef.current) clearTimeout(pollRef.current);
    pollRef.current = null;
  };

  const poll = useCallback(() => {
    if (!token) return;
    const check = () =>
      emotionApi.analysisStatus(token).then(
        (s) => {
          failuresRef.current = 0;
          setReconnecting(false);
          setStatus(s);
          if (s.status === "completed") {
            setPhase("completed");
            sessionStorage.setItem(
              `amumata_analysis_${token}`,
              JSON.stringify(s.result),
            );
            deleteFiles(token).catch(() => {});
            clearStagedNames(token);
            return;
          }
          if (s.status === "failed") {
            setPhase("failed");
            setError(s.error.message);
            return;
          }
          if (s.status === "not_started") {
            // The server lost the job (e.g. it restarted) — the recordings are still here.
            setPhase("failed");
            setError("The analysis was interrupted before it finished.");
            return;
          }
          pollRef.current = setTimeout(check, POLL_MS);
        },
        () => {
          failuresRef.current += 1;
          setReconnecting(true);
          if (failuresRef.current >= MAX_POLL_FAILURES) {
            setPhase("failed");
            setError(
              "We lost contact with the server while waiting for the analysis.",
            );
            return;
          }
          pollRef.current = setTimeout(check, POLL_MS);
        },
      );
    check();
  }, [token]);

  /** Upload the saved recordings and follow the analysis. */
  const start = useCallback(() => {
    if (!token) return;
    stopPolling();
    failuresRef.current = 0;
    setError("");
    setStatus(null);
    setPhase("uploading");

    getFiles(token)
      .then((entries) => {
        if (!entries || entries.length === 0) {
          setCanRetry(false);
          throw new Error(
            "No interview recordings were found on this device. Please retake the interview.",
          );
        }
        const files = entries.map(
          (e) => new File([e.blob], e.name, { type: e.type }),
        );
        setReceived({
          photos: files.filter((f) => f.name.startsWith("frame_")).length,
          clips: files.filter((f) => f.name.startsWith("audio_")).length,
        });
        // Answers sent early during the interview don't need uploading again.
        const { staged, toUpload } = splitStaged(token, files);
        const extras = readExtras(token);
        return emotionApi.startAnalysis(token, toUpload, staged, extras).catch((err: unknown) => {
          if (!(err instanceof StagedFilesMissingError)) throw err;
          // The server lost them (e.g. it restarted): send everything.
          clearStagedNames(token);
          return emotionApi.startAnalysis(token, files, [], extras);
        });
      })
      .then(() => {
        setPhase("analysing");
        poll();
      })
      .catch((err: unknown) => {
        setPhase("failed");
        setError(
          err instanceof Error ? err.message : "Couldn't upload the interview.",
        );
      });
  }, [token, poll]);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    start();
    return stopPolling;
  }, [start]);

  const view = describeProgress(status);
  const barPercent = usePeakEndProgress(view.percent, phase === "completed");
  const progress = status?.status === "processing" ? status.progress : null;
  const elapsed = status && "elapsed_s" in status ? status.elapsed_s : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F1F5F9] px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-md">
        <div className="text-center">
          <div
            className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${
              phase === "failed"
                ? "bg-rose-50"
                : phase === "completed"
                  ? "bg-emerald-50"
                  : "bg-teal-50"
            }`}
          >
            {phase === "failed" ? (
              <AlertCircle size={32} className="text-rose-500" />
            ) : phase === "completed" ? (
              <Check size={32} className="text-emerald-600" />
            ) : (
              <Loader2 size={32} className="animate-spin text-teal-600" />
            )}
          </div>

          <h1 className="text-2xl font-bold text-slate-900">
            {phase === "uploading"
              ? "Sending your interview"
              : phase === "analysing"
                ? "Analysing your interview"
                : phase === "completed"
                  ? "All done — thank you!"
                  : "Something went wrong"}
          </h1>

          <p
            className="mt-2 text-sm text-slate-500"
            role="status"
            aria-live="polite"
          >
            {phase === "uploading"
              ? "Uploading your recordings securely…"
              : phase === "analysing"
                ? view.label
                : phase === "completed"
                  ? "Your therapist has been notified and will review your results."
                  : error}
          </p>
        </div>

        {(phase === "analysing" || phase === "completed") && (
          <div className="mt-6 space-y-4">
            <div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full transition-[width] duration-200 ease-out ${phase === "completed" ? "bg-emerald-500" : "bg-teal-500"}`}
                  style={{ width: `${Math.max(3, barPercent)}%` }}
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(barPercent)}
                />
              </div>
              {phase === "analysing" && (
                <div className="mt-2 flex justify-between gap-2 text-xs text-slate-400">
                  <span>{elapsed !== null ? `Elapsed ${formatElapsed(elapsed)}` : " "}</span>
                  {received && (
                    <span>
                      Received {received.photos} photo{received.photos === 1 ? "" : "s"} · {received.clips} voice clip
                      {received.clips === 1 ? "" : "s"}
                    </span>
                  )}
                </div>
              )}
            </div>
            {questions.length > 0 && (
              <AnalysisWorkList
                questions={questions}
                done={progress?.done ?? 0}
                writingReport={progress?.stage === "report" || progress?.stage === "done"}
                complete={phase === "completed"}
              />
            )}
          </div>
        )}

        {phase === "analysing" && (
          <div className="mt-4">
            {reconnecting && (
              <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-amber-600">
                <WifiOff size={13} /> Connection hiccup — still waiting for the
                results…
              </p>
            )}
            <p className="mt-5 rounded-xl bg-slate-50 p-3 text-center text-xs leading-relaxed text-slate-500">
              Longer interviews can take several minutes to analyse. Please keep
              this page open — your answers are saved and nothing is lost if it
              takes a while.
            </p>
          </div>
        )}

        {phase === "failed" && (
          <div className="mt-6 space-y-3">
            <p className="rounded-xl bg-slate-50 p-3 text-center text-xs leading-relaxed text-slate-500">
              {canRetry
                ? "Your recordings are still saved on this device, so you don't need to answer the questions again."
                : "Please contact your therapist for a new interview link."}
            </p>
            {canRetry && (
              <button
                onClick={start}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-teal-700"
              >
                <RotateCcw size={16} /> Try again
              </button>
            )}
          </div>
        )}

        {phase === "completed" && (
          <button
            onClick={() => navigate(`/interview/${token}/results`)}
            className="mt-6 w-full rounded-xl bg-teal-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-teal-700"
          >
            View Results
          </button>
        )}
      </div>
    </div>
  );
}
