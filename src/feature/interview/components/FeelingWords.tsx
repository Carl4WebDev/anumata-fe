import { FEELING_WORDS, FEELINGS_PROMPT, FEELINGS_THANKS, MAX_FEELINGS_PER_QUESTION } from "../hooks/feelingWords";
import type { ResponseLanguage } from "../hooks/rapportUtils";

interface FeelingWordsProps {
  lang: ResponseLanguage;
  /** Words tapped for the current question. */
  selected: string[];
  onToggle: (key: string) => void;
  large?: boolean;
}

/** Optional feeling chips under the captions, to help the patient start talking. */
export default function FeelingWords({ lang, selected, onToggle, large = false }: FeelingWordsProps) {
  const full = selected.length >= MAX_FEELINGS_PER_QUESTION;
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
      <p className={`mb-2 text-slate-300 ${large ? "text-sm" : "text-xs"}`}>{FEELINGS_PROMPT[lang]}</p>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label={FEELINGS_PROMPT[lang]}>
        {FEELING_WORDS.map((w) => {
          const on = selected.includes(w.key);
          return (
            <button
              key={w.key}
              type="button"
              onClick={() => onToggle(w.key)}
              disabled={!on && full}
              aria-pressed={on}
              className={`flex items-center gap-1 rounded-full border px-2.5 py-1 transition disabled:opacity-40 ${large ? "text-sm" : "text-xs"} ${
                on ? "border-teal-400 bg-teal-500/25 text-teal-50" : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
              }`}
            >
              <span aria-hidden="true">{w.face}</span>
              {w.label[lang]}
            </button>
          );
        })}
      </div>
      {selected.length > 0 && (
        <p className={`mt-2 text-teal-200 ${large ? "text-sm" : "text-xs"}`} role="status">
          {FEELINGS_THANKS[lang]}
        </p>
      )}
    </div>
  );
}
