import { describe, test, expect } from "vitest";
import { nextShown, peakEndCurve } from "../usePeakEndProgress";

describe("peak-end progress bar", () => {
  test("slow start, fast finish", () => {
    expect(peakEndCurve(0)).toBe(0);
    expect(peakEndCurve(50)).toBeLessThan(40);
    expect(peakEndCurve(100)).toBe(100);
    // The last quarter of the work moves the bar further than the first quarter.
    expect(peakEndCurve(100) - peakEndCurve(75)).toBeGreaterThan(peakEndCurve(25) - peakEndCurve(0));
  });

  test("catches up with real progress", () => {
    let shown = 0;
    for (let i = 0; i < 40; i++) shown = nextShown(shown, 50, false);
    expect(shown).toBeGreaterThan(peakEndCurve(50) - 1);
  });

  test("creeps between updates but never runs far ahead or finishes by itself", () => {
    let shown = peakEndCurve(90);
    for (let i = 0; i < 5000; i++) shown = nextShown(shown, 90, false);
    expect(shown).toBeLessThanOrEqual(92);
    expect(shown).toBeGreaterThan(peakEndCurve(90));
  });

  test("sweeps to 100 quickly once done", () => {
    let shown = 40;
    let steps = 0;
    while (shown < 100 && steps < 50) {
      shown = nextShown(shown, 90, true);
      steps++;
    }
    expect(shown).toBe(100);
    expect(steps).toBeLessThan(15); // under ~3 s at 200 ms a tick
  });
});
