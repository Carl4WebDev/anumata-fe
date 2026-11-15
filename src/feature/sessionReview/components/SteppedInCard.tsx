import { MessageCircleHeart } from "lucide-react";
import type { LiveMessage } from "../../../shared/types/session";
import { describeLine, summarizeSteppedIn, whereLabel } from "../utils/steppedIn";

const time = (iso: string) => new Date(iso).toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" });
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * Session review: the therapist stepped in during the live interview — when,
 * at which questions, and the whole conversation, as saved at the time.
 */
export default function SteppedInCard({ messages }: { messages: readonly LiveMessage[] }) {
  if (messages.length === 0) return null;
  const s = summarizeSteppedIn(messages);
  const where = [...(s.beforeQuestions ? ["the warm-up"] : []), ...s.questions.map((i) => `Q${i + 1}`)].join(", ");

  return (
    <section aria-label="You stepped in" className="rounded-xl border border-teal-200 bg-white p-5 shadow-sm md:p-6">
      <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
        <MessageCircleHeart size={18} className="text-teal-600" /> You stepped in during this interview
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        {plural(s.pauses, "pause", "pauses")} · {plural(s.fromTherapist, "message from you", "messages from you")} ·{" "}
        {plural(s.fromPatient, "reply from the patient", "replies from the patient")}
        {where && <> · at {where}</>}
      </p>
      {s.unseen > 0 && (
        <p className="mt-1 text-xs text-amber-700">
          {plural(s.unseen, "message was", "messages were")} never shown on the patient's screen (e.g. they had already left).
        </p>
      )}

      <ol className="mt-4 space-y-2 text-sm" aria-label="Conversation during the interview">
        {messages.map((m) => (
          <li key={m.id} className="flex gap-3">
            <span className="w-16 shrink-0 tabular-nums text-xs text-slate-400">{time(m.at)}</span>
            <span className="w-14 shrink-0 text-xs font-medium text-teal-700">{whereLabel(m.questionIndex)}</span>
            {m.kind === "message" ? (
              <span className={m.sender === "patient" ? "text-slate-800" : "text-slate-700"}>
                <span className="font-semibold">{m.sender === "patient" ? "Patient" : "You"}:</span>{" "}
                <span className="whitespace-pre-wrap">{m.body}</span>
                {m.sender === "therapist" && (
                  <span className="ml-1.5 text-xs text-slate-400">{m.seenAt ? `seen ${time(m.seenAt)}` : "not seen"}</span>
                )}
              </span>
            ) : (
              <span className="italic text-slate-500">{describeLine(m)}</span>
            )}
          </li>
        ))}
      </ol>

      <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-400">
        While the questions were paused, the recording was paused too: the patient's replies to you are not part of the emotion analysis.
      </p>
    </section>
  );
}
