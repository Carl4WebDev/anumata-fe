import { BookOpen, Loader2, Sparkles, TriangleAlert } from "lucide-react";
import { basedOn, splitCitations, type AssistantTurn } from "../utils/assistantTurns";

interface AssistantTurnCardProps {
  turn: AssistantTurn;
  /** Show the "AI is waking up" note (the first question can take 1–3 minutes). */
  waking: boolean;
}

function AnswerText({ answer }: { answer: string }) {
  return (
    <p className="whitespace-pre-line text-sm leading-relaxed text-slate-800">
      {splitCitations(answer).map((part, i) =>
        part.kind === "text" ? (
          <span key={i}>{part.text}</span>
        ) : (
          <sup key={i} className="mx-0.5 rounded bg-teal-100 px-1 text-[10px] font-semibold text-teal-800" aria-label={`source ${part.n}`}>
            {part.n}
          </sup>
        ),
      )}
    </p>
  );
}

function AnswerBody({ turn, waking }: AssistantTurnCardProps) {
  if (turn.status === "thinking") {
    return (
      <div className="flex items-start gap-2 text-sm text-slate-600" role="status">
        <Loader2 size={16} className="mt-0.5 shrink-0 animate-spin text-teal-600" />
        <span>
          Writing an answer from the entries below…
          {waking && <span className="block text-xs text-slate-500">Waking up the AI — the first question can take 1–3 minutes.</span>}
        </span>
      </div>
    );
  }
  if (turn.status === "failed") {
    return (
      <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
        <TriangleAlert size={16} className="mt-0.5 shrink-0" /> {turn.error}
      </p>
    );
  }
  return turn.found ? <AnswerText answer={turn.answer ?? ""} /> : <p className="text-sm text-slate-600">{turn.answer}</p>;
}

/** One question, its answer, and the info-page entries the answer is based on. */
export default function AssistantTurnCard({ turn, waking }: AssistantTurnCardProps) {
  const entries = basedOn(turn);
  const answered = turn.status === "answered" && turn.found;
  return (
    <article className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-semibold text-slate-900">{turn.question}</p>
      <div className="flex gap-2">
        <Sparkles size={16} className="mt-0.5 shrink-0 text-teal-600" />
        <div className="min-w-0 flex-1">
          <AnswerBody turn={turn} waking={waking} />
        </div>
      </div>
      {entries.length > 0 && (
        <div>
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <BookOpen size={14} /> {answered ? "Based on" : "Matching entries"}
          </p>
          <ul className="space-y-1.5">
            {entries.map((entry) => (
              <li key={entry.id}>
                <details className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
                  <summary className="cursor-pointer text-slate-700">
                    {answered && (
                      <sup className="mr-1 rounded bg-teal-100 px-1 text-[10px] font-semibold text-teal-800">{turn.matches.indexOf(entry) + 1}</sup>
                    )}
                    <span className="mr-1.5 text-xs font-medium text-teal-700">{entry.source}</span>
                    {entry.title}
                  </summary>
                  <p className="mt-2 whitespace-pre-line text-slate-600">{entry.text}</p>
                </details>
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}
