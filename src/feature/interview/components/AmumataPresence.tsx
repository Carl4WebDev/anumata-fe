import { useEffect, useRef } from "react";

/** What Amumata is doing, shown by how she moves. */
export type PresenceMood = "speaking" | "listening" | "thinking" | "resting";

interface AmumataPresenceProps {
  mood: PresenceMood;
  /** Short words under her, e.g. "I'm listening". */
  label: string;
  /** The patient's mic level (0–1); while listening she swells gently with their voice. */
  getLevel?: () => number;
}

const CORE_COLORS: Record<PresenceMood, string> = {
  speaking: "from-teal-300 to-teal-600 shadow-teal-500/40",
  listening: "from-teal-200 to-cyan-500 shadow-cyan-400/30",
  thinking: "from-slate-300 to-slate-500 shadow-slate-400/20",
  resting: "from-sky-200 to-sky-500 shadow-sky-400/20",
};

/**
 * Amumata as a calm, breathing light, so the patient talks to someone rather
 * than to their own reflection. She ripples while speaking and responds to
 * the patient's voice while listening.
 */
export default function AmumataPresence({ mood, label, getLevel }: AmumataPresenceProps) {
  const coreRef = useRef<HTMLDivElement>(null);

  // Follow the patient's voice by writing to the DOM each frame (no re-renders).
  useEffect(() => {
    const core = coreRef.current;
    if (mood !== "listening" || !getLevel || !core) return;
    let frame = 0;
    const draw = () => {
      // Speech RMS rarely exceeds ~0.25; scale so normal talking is visible but gentle.
      const level = Math.min(1, getLevel() * 4);
      core.style.transform = `scale(${1 + level * 0.12})`;
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      core.style.transform = "";
    };
  }, [mood, getLevel]);

  return (
    <div className="flex flex-col items-center gap-4 lg:gap-6" data-mood={mood}>
      <div className="relative flex h-28 w-28 items-center justify-center sm:h-36 sm:w-36 lg:h-48 lg:w-48">
        {mood === "speaking" && (
          <>
            <span className="animate-amumata-ripple absolute inset-0 rounded-full bg-teal-400/30" />
            <span className="animate-amumata-ripple absolute inset-0 rounded-full bg-teal-400/20 [animation-delay:1.2s]" />
          </>
        )}
        <div className={mood === "listening" ? "" : "animate-amumata-breathe"}>
          <div
            ref={coreRef}
            className={`h-20 w-20 rounded-full bg-linear-to-br shadow-2xl transition-[transform,background-color] duration-150 sm:h-24 sm:w-24 lg:h-32 lg:w-32 ${CORE_COLORS[mood]} ${mood === "thinking" || mood === "resting" ? "opacity-80" : ""}`}
          >
            <div className="ml-[22%] mt-[18%] h-1/4 w-1/4 rounded-full bg-white/40 blur-sm" />
          </div>
        </div>
      </div>
      <p className="text-sm font-medium text-slate-300 lg:text-base" aria-live="polite">
        {label}
      </p>
    </div>
  );
}
