import { describe, test, expect } from "vitest";
import { decideCheckIn, MAX_CHECK_INS, sensitiveFlagsOf, soundsHardToAnswer, type CheckInSituation } from "../struggleCheck";

const base: CheckInSituation = {
  now: 0,
  silenceSince: 0,
  hasAnswer: false,
  voiceActive: false,
  pendingTranscripts: 0,
  hardWordsAt: null,
  posture: { headDownMs: 0, stillMs: 0 },
  sensitive: false,
  askedThisQuestion: false,
  checkInsSoFar: 0,
};
const at = (seconds: number, extra: Partial<CheckInSituation> = {}) => decideCheckIn({ ...base, now: seconds * 1000, ...extra });

describe("when Amumata checks in", () => {
  test("no answer for a long while — sooner on a sensitive question", () => {
    expect(at(12)).toBeNull();
    expect(at(13)).toBe("no_answer");
    expect(at(10, { sensitive: true })).toBe("no_answer");
  });

  test("head down or a blank stare counts only together with silence", () => {
    const headDown = { posture: { headDownMs: 5000, stillMs: 0 } };
    expect(at(5, headDown)).toBeNull(); // silent only 5 s
    expect(at(8, headDown)).toBe("head_down");
    expect(at(6, { ...headDown, sensitive: true })).toBe("head_down");
    expect(at(8, { posture: { headDownMs: 0, stillMs: 7000 } })).toBe("still");
    // Talking with the head down is fine.
    expect(at(20, { ...headDown, voiceActive: true })).toBeNull();
    expect(at(20, { ...headDown, hasAnswer: true })).toBeNull();
  });

  test("saying it's hard gets a check-in after a short pause, even mid-answer", () => {
    expect(at(1, { hardWordsAt: 0, hasAnswer: true })).toBeNull();
    expect(at(3, { hardWordsAt: 0, hasAnswer: true })).toBe("said_hard");
  });

  test("once per question, and at most a few per interview", () => {
    expect(at(20, { askedThisQuestion: true })).toBeNull();
    expect(at(20, { checkInsSoFar: MAX_CHECK_INS })).toBeNull();
    expect(at(20, { pendingTranscripts: 1 })).toBeNull();
  });
});

describe("'hard to answer' phrases", () => {
  test.each(["I don't know", "Hindi ko alam eh", "Lisod isulti", "ambot lang", "Ewan ko.", "wala ko kabalo unsaon", "mahirap sagutin"])(
    "%s",
    (text) => {
      expect(soundsHardToAnswer(text)).toBe(true);
    },
  );

  test("ordinary answers don't match — including hard things said as part of an answer", () => {
    expect(soundsHardToAnswer("I know it was hard for my mother")).toBe(false);
    expect(soundsHardToAnswer("Okay lang ko")).toBe(false);
    expect(soundsHardToAnswer("Lisod ang kinabuhi karon")).toBe(false);
    expect(soundsHardToAnswer("I don't know why he left me after all those years")).toBe(false);
  });
});

test("reads which questions are marked sensitive", () => {
  expect(sensitiveFlagsOf([{ text: "a", sensitive: true }, { text: "b" }, "c"])).toEqual([true, false, false]);
});
