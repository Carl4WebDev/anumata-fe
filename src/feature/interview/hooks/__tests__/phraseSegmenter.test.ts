import { describe, test, expect } from "vitest";
import { createPhraseSegmenter, DEFAULT_SEGMENTER_CONFIG } from "../phraseSegmenter";

const VOICE = 0.1;
const QUIET = 0.002;

/** Feed `level` every 100 ms from `from` to `to`; returns the cuts seen. */
function run(seg: ReturnType<typeof createPhraseSegmenter>, level: number, from: number, to: number) {
  const cuts: { at: number; cut: string }[] = [];
  for (let t = from; t < to; t += 100) {
    const step = seg.feed(level, t);
    if (step.cut !== "none") cuts.push({ at: t, cut: step.cut });
  }
  return cuts;
}

describe("createPhraseSegmenter", () => {
  test("a phrase is sent after a pause that follows speech", () => {
    const seg = createPhraseSegmenter();
    expect(run(seg, QUIET, 0, 1000)).toEqual([]);
    expect(run(seg, VOICE, 1000, 2500)).toEqual([]);
    const cuts = run(seg, QUIET, 2500, 4000);
    expect(cuts).toHaveLength(1);
    expect(cuts[0].cut).toBe("send");
    // Cut after ~pauseMs of quiet (last voice at 2400).
    expect(cuts[0].at - 2400).toBeGreaterThanOrEqual(DEFAULT_SEGMENTER_CONFIG.pauseMs);
  });

  test("continuous talking is still cut at the max segment length", () => {
    const seg = createPhraseSegmenter();
    const cuts = run(seg, VOICE, 0, 25000);
    expect(cuts.length).toBeGreaterThanOrEqual(2);
    expect(cuts.every((c) => c.cut === "send")).toBe(true);
  });

  test("long silence is discarded, never sent", () => {
    const seg = createPhraseSegmenter();
    const cuts = run(seg, QUIET, 0, 30000);
    expect(cuts.length).toBeGreaterThan(0);
    expect(cuts.every((c) => c.cut === "discard")).toBe(true);
  });

  test("a click shorter than the minimum voiced time is not a phrase", () => {
    const seg = createPhraseSegmenter();
    run(seg, QUIET, 0, 500);
    run(seg, VOICE, 500, 600); // single 100 ms blip
    const cuts = run(seg, QUIET, 600, 3000);
    expect(cuts.filter((c) => c.cut === "send")).toEqual([]);
  });

  test("voice activity is reported while talking and shortly after", () => {
    const seg = createPhraseSegmenter();
    seg.feed(QUIET, 0);
    expect(seg.feed(VOICE, 100).voiceActive).toBe(true);
    expect(seg.feed(QUIET, 300).voiceActive).toBe(true); // hangover
    expect(seg.feed(QUIET, 600).voiceActive).toBe(false);
    expect(seg.lastVoiceAt).toBe(100);
  });

  test("adapts to a noisy room: steady background is not mistaken for voice", () => {
    const seg = createPhraseSegmenter();
    const NOISE = 0.02; // above the absolute minimum threshold
    // Background noise that is just under the threshold at first lifts the floor.
    run(seg, 0.011, 0, 5000);
    const cuts = run(seg, NOISE, 5000, 8000).filter((c) => c.cut === "send");
    expect(cuts).toEqual([]);
  });

  test("reset clears the last voice time", () => {
    const seg = createPhraseSegmenter();
    seg.feed(VOICE, 0);
    seg.feed(VOICE, 100);
    seg.reset(200);
    expect(seg.lastVoiceAt).toBeNull();
  });
});
