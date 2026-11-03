import { Coffee, Heart, SkipForward } from "lucide-react";
import { CHECK_IN_ACTIONS } from "../hooks/struggleCheck";
import type { ResponseLanguage } from "../hooks/rapportUtils";

interface CheckInActionsProps {
  lang: ResponseLanguage;
  onContinue: () => void;
  onBreak: () => void;
  onSkip: () => void;
}

/** The three choices offered with a check-in — the same as saying "oo", "pahulay" or "sunod". */
export default function CheckInActions({ lang, onContinue, onBreak, onSkip }: CheckInActionsProps) {
  const btn = "flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition";
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-teal-500/30 bg-teal-500/10 p-3 sm:flex-row" role="group" aria-label="Are you okay to continue?">
      <button onClick={onContinue} className={`${btn} bg-teal-600 hover:bg-teal-700`}>
        <Heart size={16} /> {CHECK_IN_ACTIONS.continue[lang]}
      </button>
      <button onClick={onBreak} className={`${btn} bg-white/10 hover:bg-white/20`}>
        <Coffee size={16} /> {CHECK_IN_ACTIONS.break[lang]}
      </button>
      <button onClick={onSkip} className={`${btn} bg-white/10 hover:bg-white/20`}>
        <SkipForward size={16} /> {CHECK_IN_ACTIONS.skip[lang]}
      </button>
    </div>
  );
}
