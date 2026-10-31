import { emotionCues, type CueKind } from "../utils/emotionCues";

interface EmotionCuesProps {
  emotion: string | null | undefined;
  kind: CueKind;
  /** Smaller text for dense cards. */
  compact?: boolean;
}

const HEADINGS: Record<CueKind, string> = {
  face: "Typical facial signs",
  voice: "Typical vocal signs",
};

const NOTE: Record<CueKind, string> = {
  face: "General signs of this expression — check them against the evidence frames.",
  voice: "General signs of this tone — check them against the recording.",
};

/** What a detected emotion usually looks / sounds like, for the therapist to verify. */
export default function EmotionCues({ emotion, kind, compact = false }: EmotionCuesProps) {
  const cues = emotionCues(emotion, kind);
  if (cues.length === 0) return null;

  return (
    <div className={compact ? "mt-2" : "mt-2.5"}>
      <p className={`${compact ? "text-[10px]" : "text-[11px]"} font-medium text-slate-500`}>
        {HEADINGS[kind]} of {emotion?.toLowerCase()}:
      </p>
      <ul className="mt-1 flex flex-wrap gap-1" aria-label={`${HEADINGS[kind]} of ${emotion}`}>
        {cues.map((cue) => (
          <li
            key={cue}
            className={`rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 ${compact ? "text-[10px]" : "text-[11px]"} text-slate-600`}
          >
            {cue}
          </li>
        ))}
      </ul>
      <p className="mt-1 text-[10px] italic text-slate-400">{NOTE[kind]}</p>
    </div>
  );
}
