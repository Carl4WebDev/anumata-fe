import { describe, test, expect } from "vitest";
import {
  SUPPORT_CONTINUE,
  SUPPORT_HEARD,
  SUPPORT_LINES,
  SUPPORT_OPENING,
  SUPPORT_TEXT,
  SUPPORT_TIMING,
  isSupportContinue,
  nextSupportLine,
  shouldSayHeard,
  startPace,
} from "../crisisSupport";

const GAP = SUPPORT_TIMING.lineGapMs;

describe("support mode lines", () => {
  test("every line exists in English, Tagalog and Bisaya", () => {
    for (const line of [SUPPORT_OPENING, SUPPORT_HEARD, SUPPORT_CONTINUE, ...SUPPORT_LINES, ...Object.values(SUPPORT_TEXT)]) {
      expect(line.en && line.tl && line.ceb).toBeTruthy();
    }
  });

  test("never promises, judges or tells the patient not to do it", () => {
    const all = [SUPPORT_OPENING, SUPPORT_HEARD, ...SUPPORT_LINES].map((l) => l.en.toLowerCase()).join(" ");
    for (const phrase of ["don't do", "promise", "everything will be fine", "you shouldn't", "selfish"]) {
      expect(all).not.toContain(phrase);
    }
  });
});

describe("nextSupportLine", () => {
  test("waits for a quiet while after the last line", () => {
    const pace = startPace(0);
    expect(nextSupportLine(pace, GAP - 1, null, false)).toBeNull();
    expect(nextSupportLine(pace, GAP, null, false)).toBe(0);
  });

  test("not while the patient is talking, and quiet counts from their last words", () => {
    const pace = startPace(0);
    expect(nextSupportLine(pace, GAP + 5000, GAP, true)).toBeNull();
    expect(nextSupportLine(pace, GAP + 5000, 10_000, false)).toBeNull();
    expect(nextSupportLine(pace, 10_000 + GAP, 10_000, false)).toBe(0);
  });

  test("lines go in order, and stop after the last one", () => {
    expect(nextSupportLine({ ...startPace(0), linesSaid: 2 }, GAP, null, false)).toBe(2);
    expect(nextSupportLine({ ...startPace(0), linesSaid: SUPPORT_TIMING.maxLines }, 10 * GAP, null, false)).toBeNull();
  });
});

describe("shouldSayHeard", () => {
  test("answers red-flag words again, but not too often and only a few times", () => {
    const pace = startPace(0);
    expect(shouldSayHeard(pace, 1000)).toBe(true);
    const after = { ...pace, heardCount: 1, lastHeardAt: 1000 };
    expect(shouldSayHeard(after, 1000 + SUPPORT_TIMING.heardGapMs - 1)).toBe(false);
    expect(shouldSayHeard(after, 1000 + SUPPORT_TIMING.heardGapMs)).toBe(true);
    expect(shouldSayHeard({ ...after, heardCount: SUPPORT_TIMING.maxHeard }, 999_999)).toBe(false);
  });
});

describe("isSupportContinue", () => {
  test.each(["Padayon", "Ituloy na po", "I'm ready", "continue", "padayon na lang", "Andam na ko"])("continues: '%s'", (text) => {
    expect(isSupportContinue(text)).toBe(true);
  });

  test.each(["Wala na", "okay", "oo", "tapos na", "I can't continue like this", ""])("doesn't: '%s'", (text) => {
    expect(isSupportContinue(text)).toBe(false);
  });
});
