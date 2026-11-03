import { describe, test, expect } from "vitest";
import { decideTurn, questionTiming, QUESTION_TIMING, RELAXED_QUESTION_TIMING, WARMUP_TIMING, type TurnClock } from "../handsFree";

const base: TurnClock = {
  now: 0,
  silenceSince: 0,
  hasAnswer: false,
  voiceActive: false,
  pendingTranscripts: 0,
  confirmAskedAt: null,
};

describe("decideTurn — formal questions (tell the patient, then move on)", () => {
  test("3 s of silence after an answer → tell the patient it's moving on", () => {
    expect(decideTurn({ ...base, hasAnswer: true, now: 2900 }, QUESTION_TIMING)).toBe("wait");
    expect(decideTurn({ ...base, hasAnswer: true, now: 3000 }, QUESTION_TIMING)).toBe("ask_confirm");
  });

  test("waits much longer when nothing was said yet (thinking time)", () => {
    expect(decideTurn({ ...base, now: 10000 }, QUESTION_TIMING)).toBe("wait");
    expect(decideTurn({ ...base, now: 15000 }, QUESTION_TIMING)).toBe("ask_confirm");
  });

  test("never interrupts while the patient talks or a phrase is still transcribing", () => {
    expect(decideTurn({ ...base, hasAnswer: true, now: 60000, voiceActive: true }, QUESTION_TIMING)).toBe("wait");
    expect(decideTurn({ ...base, hasAnswer: true, now: 60000, pendingTranscripts: 1 }, QUESTION_TIMING)).toBe("wait");
  });

  test("moves on after the 3 s countdown if the patient stays quiet", () => {
    const asked = { ...base, hasAnswer: true, confirmAskedAt: 10000 };
    expect(decideTurn({ ...asked, now: 12000 }, QUESTION_TIMING)).toBe("wait");
    expect(decideTurn({ ...asked, now: 13000 }, QUESTION_TIMING)).toBe("auto_proceed");
  });

  test("silence is counted from the last voice, not the turn start", () => {
    expect(decideTurn({ ...base, hasAnswer: true, silenceSince: 30000, now: 32900 }, QUESTION_TIMING)).toBe("wait");
  });
});

describe("decideTurn — warm-up questions", () => {
  test("moves on directly after a short pause, no check-in", () => {
    expect(decideTurn({ ...base, hasAnswer: true, now: 2000 }, WARMUP_TIMING)).toBe("wait");
    expect(decideTurn({ ...base, hasAnswer: true, now: 2500 }, WARMUP_TIMING)).toBe("proceed");
  });

  test("still nudges a silent patient", () => {
    expect(decideTurn({ ...base, now: 20000 }, WARMUP_TIMING)).toBe("ask_confirm");
  });
});

describe("more time to think", () => {
  test("waits 7 s after an answer instead of 3 s", () => {
    const clock: TurnClock = { now: 0, silenceSince: 0, hasAnswer: true, voiceActive: false, pendingTranscripts: 0, confirmAskedAt: null };
    expect(questionTiming(true)).toBe(RELAXED_QUESTION_TIMING);
    expect(questionTiming(false)).toBe(QUESTION_TIMING);
    expect(decideTurn({ ...clock, now: 3000 }, RELAXED_QUESTION_TIMING)).toBe("wait");
    expect(decideTurn({ ...clock, now: 7000 }, RELAXED_QUESTION_TIMING)).toBe("ask_confirm");
  });
});
