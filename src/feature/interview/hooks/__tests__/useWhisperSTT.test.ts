import { describe, it, expect } from "vitest";
import { createSilenceTracker } from "../useWhisperSTT";

const config = {
  silenceThreshold: 0.015,
  silenceMs: 2000,
  maxDurationMs: 30000,
};

describe("createSilenceTracker", () => {
  it("does not stop while the patient is still thinking before speech", () => {
    // Regression: the old timer counted silence from recording start and cut
    // patients off within 2.5s — before they said anything.
    const tracker = createSilenceTracker(config);
    for (let t = 0; t <= 10000; t += 100) {
      expect(tracker.feed(0.001, t)).toBe("continue");
    }
  });

  it("stops after trailing silence once speech has started", () => {
    const tracker = createSilenceTracker(config);
    expect(tracker.feed(0.1, 100)).toBe("continue"); // speech onset
    expect(tracker.feed(0.001, 500)).toBe("continue"); // silence starts
    expect(tracker.feed(0.001, 2400)).toBe("continue"); // 1.9s into silence
    expect(tracker.feed(0.001, 2600)).toBe("stop"); // 2.1s into silence
  });

  it("resets the silence countdown when speech resumes", () => {
    const tracker = createSilenceTracker(config);
    tracker.feed(0.1, 100);
    expect(tracker.feed(0.001, 500)).toBe("continue");
    expect(tracker.feed(0.1, 1500)).toBe("continue"); // talks again
    expect(tracker.feed(0.001, 3000)).toBe("continue"); // silence restarts
    expect(tracker.feed(0.001, 3400)).toBe("continue");
    expect(tracker.feed(0.001, 5100)).toBe("stop");
  });

  it("stops at the hard duration cap even with continuous speech", () => {
    const tracker = createSilenceTracker(config);
    for (let t = 0; t < 30000; t += 1000) {
      expect(tracker.feed(0.5, t)).toBe("continue");
    }
    expect(tracker.feed(0.5, 30000)).toBe("stop");
  });

  it("stops at the duration cap when nothing is ever said", () => {
    const tracker = createSilenceTracker(config);
    expect(tracker.feed(0.001, 29900)).toBe("continue");
    expect(tracker.feed(0.001, 30100)).toBe("stop");
  });

  it("reports whether speech has started", () => {
    const tracker = createSilenceTracker(config);
    expect(tracker.speechStarted).toBe(false);
    tracker.feed(0.001, 100);
    expect(tracker.speechStarted).toBe(false);
    tracker.feed(0.1, 200);
    expect(tracker.speechStarted).toBe(true);
  });
});
