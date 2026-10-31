import { useEffect, useRef, useState } from "react";

const TICK_MS = 200;
/** Slow start, fast finish: people remember how a wait ends (peak-end rule). */
const CURVE = 1.5;
/** While waiting for the next real update, creep at most this far ahead of it. */
const CREEP_AHEAD = 8;
const CREEP_CAP = 92;

/** Real progress (0–100) → where the bar is drawn. */
export function peakEndCurve(percent: number): number {
  const p = Math.min(100, Math.max(0, percent)) / 100;
  return 100 * Math.pow(p, CURVE);
}

/** One animation step toward the drawn position. Pure, for testing. */
export function nextShown(shown: number, real: number | null, done: boolean): number {
  if (done) return shown >= 99.5 ? 100 : Math.min(100, shown + Math.max(4, (100 - shown) * 0.35)); // quick, satisfying finish
  const target = real === null ? 0 : peakEndCurve(real);
  if (shown < target) return shown + (target - shown) * 0.25; // catch up with real work
  // Between updates: keep moving a little so the bar never looks stuck,
  // but never run ahead of the next real step or finish on its own.
  const ceiling = Math.min(target + CREEP_AHEAD, CREEP_CAP);
  return shown < ceiling ? shown + (ceiling - shown) * 0.01 : shown;
}

/**
 * Progress bar position that follows real progress with a slow start and a
 * fast finish, creeps gently between server updates, and sweeps to 100 %
 * when the work is done.
 */
export function usePeakEndProgress(real: number | null, done: boolean): number {
  const [shown, setShown] = useState(0);
  const inputRef = useRef({ real, done });
  useEffect(() => {
    inputRef.current = { real, done };
  });

  useEffect(() => {
    const id = setInterval(() => {
      setShown((prev) => {
        const next = nextShown(prev, inputRef.current.real, inputRef.current.done);
        return Math.abs(next - prev) < 0.01 ? prev : next;
      });
    }, TICK_MS);
    return () => clearInterval(id);
  }, []);

  return shown;
}
