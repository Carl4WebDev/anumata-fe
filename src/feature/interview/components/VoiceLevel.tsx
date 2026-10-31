import { useEffect, useRef } from "react";

const BARS = 12;

interface VoiceLevelProps {
  /** Current mic RMS (0–1), read on every animation frame. */
  getLevel: () => number;
  active: boolean;
}

/** Live microphone level bars — updates via the DOM, not React state. */
export default function VoiceLevel({ getLevel, active }: VoiceLevelProps) {
  const barsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let frame = 0;
    const draw = () => {
      const bars = barsRef.current?.children;
      if (bars) {
        // Speech RMS rarely exceeds ~0.25; scale so normal talking fills the meter.
        const level = active ? Math.min(1, getLevel() * 5) : 0;
        for (let i = 0; i < bars.length; i++) {
          const center = 1 - Math.abs(i - (BARS - 1) / 2) / (BARS / 2);
          const h = 4 + level * 28 * (0.5 + center * 0.5);
          (bars[i] as HTMLElement).style.height = `${h}px`;
        }
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [getLevel, active]);

  return (
    <div ref={barsRef} className="flex h-8 items-center gap-1" aria-hidden="true">
      {Array.from({ length: BARS }, (_, i) => (
        <div key={i} className={`w-1.5 rounded-full transition-[height] duration-75 ${active ? "bg-teal-400" : "bg-slate-600"}`} style={{ height: 4 }} />
      ))}
    </div>
  );
}
