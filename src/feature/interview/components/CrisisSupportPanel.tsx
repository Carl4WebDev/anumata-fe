import { useState } from "react";
import { Coffee, Eye, HeartHandshake, Phone, Play, Square } from "lucide-react";
import { SUPPORT_TEXT } from "../hooks/crisisSupport";
import type { LocalizedLine, ResponseLanguage } from "../hooks/rapportUtils";

interface CrisisSupportPanelProps {
  lang: ResponseLanguage;
  /** What Amumata said last (shown, as it is also spoken). */
  line: LocalizedLine;
  /** The urgent alert to the therapist: on its way, received, or it didn't go through. */
  alert: "sending" | "sent" | "failed";
  /** The therapist has the live view open right now. */
  watching: boolean;
  /** In the questions (not the warm-up): recording, breaks and stopping apply. */
  inQuestions: boolean;
  onContinue: () => void;
  onBreak: () => void;
  onEnd: () => void;
}

const choiceBtn = "flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition";

/**
 * Shown while support mode is on: the questions are paused and Amumata keeps
 * the patient company. Honest about who knows — "your therapist is here now"
 * only while the therapist really has the live view open.
 */
export default function CrisisSupportPanel({ lang, line, alert, watching, inQuestions, onContinue, onBreak, onEnd }: CrisisSupportPanelProps) {
  const [confirmEnd, setConfirmEnd] = useState(false);
  // Never claims more than is known: nothing about the therapist if the alert failed.
  const status = watching ? SUPPORT_TEXT.watching : alert === "sent" ? SUPPORT_TEXT.alerted : alert === "sending" ? SUPPORT_TEXT.alerting : null;

  return (
    <section aria-label="Support" className="rounded-2xl border border-rose-300/40 bg-slate-900/60 p-4 md:p-5">
      <p className="flex items-center gap-2 text-base font-semibold text-rose-50">
        <HeartHandshake size={18} /> {SUPPORT_TEXT.title[lang]}
      </p>
      <p className="mt-3 text-lg leading-relaxed text-white" aria-live="polite">
        {line[lang]}
      </p>
      {status && (
        <p role="status" className={`mt-3 flex items-center gap-2 text-sm ${watching ? "font-semibold text-emerald-300" : "text-rose-100"}`}>
          {watching && <Eye size={15} />} {status[lang]}
        </p>
      )}
      {inQuestions && <p className="mt-1 text-xs text-slate-400">{SUPPORT_TEXT.recording[lang]}</p>}

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <a href="tel:1553" className={`${choiceBtn} bg-rose-600 text-white hover:bg-rose-700`}>
          <Phone size={16} /> {SUPPORT_TEXT.call[lang]}
        </a>
        <button onClick={onContinue} className={`${choiceBtn} bg-teal-600 text-white hover:bg-teal-700`}>
          <Play size={16} /> {SUPPORT_TEXT.continue[lang]}
        </button>
        {inQuestions && (
          <button onClick={onBreak} className={`${choiceBtn} bg-white/10 text-white hover:bg-white/20`}>
            <Coffee size={16} /> {SUPPORT_TEXT.break[lang]}
          </button>
        )}
        {inQuestions && (
          <button
            onClick={() => (confirmEnd ? onEnd() : setConfirmEnd(true))}
            className={`${choiceBtn} ${confirmEnd ? "bg-amber-500 text-slate-900 hover:bg-amber-400" : "bg-white/10 text-white hover:bg-white/20"}`}
          >
            <Square size={16} /> {confirmEnd ? SUPPORT_TEXT.endConfirm[lang] : SUPPORT_TEXT.end[lang]}
          </button>
        )}
      </div>
    </section>
  );
}
