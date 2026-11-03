import { describe, test, expect } from "vitest";
import { createPostureTracker, HEAD_DOWN_SHIFT, type FaceSighting } from "../postureCheck";

const face = (cy: number, wobble = 0): FaceSighting => ({
  cy,
  height: 0.4,
  points: [
    { x: 0.4 + wobble, y: cy - 0.05 },
    { x: 0.6 + wobble, y: cy - 0.05 },
    { x: 0.5 + wobble, y: cy },
  ],
});

/** Feed one sighting per second, alternating a small natural movement. */
function feedSeconds(tracker: ReturnType<typeof createPostureTracker>, start: number, seconds: number, make: (i: number) => FaceSighting | null, usable = true) {
  for (let i = 0; i < seconds; i += 1) tracker.feed(make(i), usable, (start + i) * 1000);
  return start + seconds;
}

describe("posture tracker", () => {
  test("learns the usual position, then notices the head going down", () => {
    const t = createPostureTracker();
    let s = feedSeconds(t, 0, 6, (i) => face(0.5, i % 2 ? 0.02 : 0)); // upright, moving a little
    expect(t.read()).toEqual({ headDownMs: 0, stillMs: 0 });
    s = feedSeconds(t, s, 5, (i) => face(0.5 + HEAD_DOWN_SHIFT + 0.05, i % 2 ? 0.02 : 0));
    expect(t.read().headDownMs).toBe(5000);
    feedSeconds(t, s, 1, () => face(0.5, 0.02)); // looks up again
    expect(t.read().headDownMs).toBe(0);
  });

  test("a face that disappears after being seen counts as head down — but not in the dark", () => {
    const t = createPostureTracker();
    let s = feedSeconds(t, 0, 6, (i) => face(0.5, i % 2 ? 0.02 : 0));
    s = feedSeconds(t, s, 4, () => null);
    expect(t.read().headDownMs).toBe(4000);
    feedSeconds(t, s, 3, () => null, false);
    expect(t.read().headDownMs).toBe(0);
  });

  test("before the usual position is known, nothing counts as head down", () => {
    const t = createPostureTracker();
    feedSeconds(t, 0, 3, () => null);
    expect(t.read().headDownMs).toBe(0);
  });

  test("a face that barely moves for a while is still (blank stare); any movement resets it", () => {
    const t = createPostureTracker();
    let s = feedSeconds(t, 0, 7, () => face(0.5));
    expect(t.read().stillMs).toBe(6000);
    s = feedSeconds(t, s, 1, () => face(0.5, 0.03));
    expect(t.read().stillMs).toBe(0);
    feedSeconds(t, s, 3, () => face(0.5, 0.03));
    expect(t.read().stillMs).toBe(3000);
  });

  test("a new question restarts the clocks", () => {
    const t = createPostureTracker();
    feedSeconds(t, 0, 7, () => face(0.5));
    t.resetClocks();
    expect(t.read()).toEqual({ headDownMs: 0, stillMs: 0 });
  });
});
