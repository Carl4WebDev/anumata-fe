import { Check, Loader2 } from "lucide-react";

interface AnalysisWorkListProps {
  /** The interview's questions, in order. */
  questions: string[];
  /** Answers fully analysed so far (from the server). */
  done: number;
  /** The server is writing the therapist's summary. */
  writingReport: boolean;
  /** Everything finished. */
  complete: boolean;
}

type RowState = "done" | "active" | "waiting";

function Row({ state, title, detail }: { state: RowState; title: string; detail: string }) {
  return (
    <li className="flex items-start gap-3 py-2">
      <span
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
          state === "done" ? "bg-emerald-100 text-emerald-600" : state === "active" ? "bg-teal-50 text-teal-600" : "bg-slate-100"
        }`}
      >
        {state === "done" ? <Check size={12} /> : state === "active" ? <Loader2 size={12} className="animate-spin" /> : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block truncate text-sm ${state === "waiting" ? "text-slate-400" : "text-slate-700"}`}>{title}</span>
        {state !== "waiting" && <span className="block text-xs text-slate-400">{detail}</span>}
      </span>
    </li>
  );
}

/**
 * "Show the work": each answer ticks off as the server finishes it, so the
 * patient sees real work happening instead of a spinner.
 */
export default function AnalysisWorkList({ questions, done, writingReport, complete }: AnalysisWorkListProps) {
  const answerState = (i: number): RowState =>
    complete || i < done ? "done" : i === done && !writingReport ? "active" : "waiting";
  const reportState: RowState = complete ? "done" : writingReport ? "active" : "waiting";

  return (
    <ol className="max-h-60 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-100 px-3" aria-label="Analysis steps">
      {questions.map((q, i) => (
        <Row
          key={i}
          state={answerState(i)}
          title={`Answer ${i + 1}: ${q}`}
          detail={answerState(i) === "done" ? "Face, voice and words checked" : "Checking face, voice and words…"}
        />
      ))}
      <Row
        state={reportState}
        title="Summary for your therapist"
        detail={reportState === "done" ? "Written and saved" : "Writing…"}
      />
    </ol>
  );
}
