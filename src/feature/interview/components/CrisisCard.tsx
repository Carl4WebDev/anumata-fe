import { useState } from "react";
import { HeartHandshake, Phone } from "lucide-react";
import { CRISIS_HOTLINES, CRISIS_TEXT } from "../hooks/crisisDetection";
import type { ResponseLanguage } from "../hooks/rapportUtils";

interface CrisisCardProps {
  lang: ResponseLanguage;
  /** The therapist really received the urgent alert. */
  notified: boolean;
}

/**
 * Shown when the patient's words may mean self-harm. Calm, in their language,
 * with tap-to-call hotlines. It can be tucked away but stays reachable.
 */
export default function CrisisCard({ lang, notified }: CrisisCardProps) {
  const [hidden, setHidden] = useState(false);

  if (hidden) {
    return (
      <button
        onClick={() => setHidden(false)}
        className="flex items-center justify-center gap-2 self-start rounded-full bg-rose-500/20 px-4 py-2 text-sm font-medium text-rose-100 transition hover:bg-rose-500/30"
      >
        <Phone size={14} /> Help lines
      </button>
    );
  }

  return (
    <div role="alert" className="rounded-2xl border border-rose-300/40 bg-rose-500/15 p-4 md:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="flex items-center gap-2 text-base font-semibold text-rose-50">
          <HeartHandshake size={18} /> {CRISIS_TEXT.title[lang]}
        </p>
        <button onClick={() => setHidden(true)} className="text-xs text-rose-200 underline-offset-2 hover:underline">
          Hide
        </button>
      </div>
      <p className="mt-2 text-sm text-rose-100">{CRISIS_TEXT.body[lang]}</p>
      <ul className="mt-3 space-y-1.5">
        {CRISIS_HOTLINES.map((line) => (
          <li key={line.name} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <span className="font-medium text-white">{line.name}:</span>
            {line.numbers.map((n) => (
              <a
                key={n.tel}
                href={`tel:${n.tel}`}
                className="rounded-md bg-white/10 px-2 py-0.5 font-mono text-rose-50 transition hover:bg-white/20"
              >
                {n.label}
              </a>
            ))}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm font-semibold text-rose-50">{CRISIS_TEXT.emergency[lang]}</p>
      {notified && <p className="mt-2 text-sm text-rose-100">{CRISIS_TEXT.notified[lang]}</p>}
      <p className="mt-2 text-xs text-rose-200/80">{CRISIS_TEXT.carryOn[lang]}</p>
    </div>
  );
}
