import { MOOD_SCALE, MOOD_SKIP } from "../hooks/moodCheck";
import type { ResponseLanguage } from "../hooks/rapportUtils";

interface MoodCheckProps {
  lang: ResponseLanguage;
  /** 1–5, or null when the patient skips. */
  onChoose: (mood: number | null) => void;
  large?: boolean;
}

/** Five faces to tap for "How are you feeling right now?", plus a quiet Skip. */
export default function MoodCheck({ lang, onChoose, large = false }: MoodCheckProps) {
  return (
    <div className="rounded-2xl border border-teal-500/20 bg-white/5 p-4">
      <div className="grid grid-cols-5 gap-2" role="group" aria-label="How are you feeling?">
        {MOOD_SCALE.map((m) => (
          <button
            key={m.value}
            onClick={() => onChoose(m.value)}
            className="flex flex-col items-center gap-1 rounded-xl border border-white/10 bg-white/5 px-1 py-3 transition hover:border-teal-400 hover:bg-teal-500/15 focus:border-teal-400"
            aria-label={m.label[lang]}
          >
            <span className={large ? "text-4xl" : "text-3xl"} aria-hidden="true">
              {m.face}
            </span>
            <span className={`text-center leading-tight text-slate-200 ${large ? "text-sm" : "text-[11px]"}`}>{m.label[lang]}</span>
          </button>
        ))}
      </div>
      <button onClick={() => onChoose(null)} className="mx-auto mt-3 block text-xs text-slate-400 underline-offset-2 hover:underline">
        {MOOD_SKIP[lang]}
      </button>
    </div>
  );
}
