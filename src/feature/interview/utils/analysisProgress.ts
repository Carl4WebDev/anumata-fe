import type { AnalysisStatus } from "../../../shared/api/emotionApi";

export interface ProgressView {
  /** Main line shown to the patient. */
  label: string;
  /** 0–100, or null when the amount of work is unknown. */
  percent: number | null;
}

/** Turn the server's status into a short, honest line for the patient. */
export function describeProgress(status: AnalysisStatus | null): ProgressView {
  if (!status || status.status === "not_started") return { label: "Starting the analysis…", percent: null };
  if (status.status === "completed") return { label: "Analysis complete", percent: 100 };
  if (status.status === "failed") return { label: "The analysis didn't finish", percent: null };

  const p = status.progress;
  if (!p || p.total <= 0) return { label: "Analysing your answers…", percent: null };
  if (p.stage === "report") return { label: "Writing the summary for your therapist…", percent: 95 };
  if (p.stage === "done") return { label: "Saving the results…", percent: 99 };
  const current = Math.min(p.done + 1, p.total);
  // Answers are ~90% of the work; the summary report is the rest.
  return { label: `Analysing answer ${current} of ${p.total}…`, percent: Math.round((p.done / p.total) * 90) };
}

/** "45 s", "3 min 05 s" */
export function formatElapsed(seconds: number): string {
  if (seconds < 60) return `${seconds} s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m} min ${String(s).padStart(2, "0")} s`;
}
