import { describe, test, expect } from "vitest";
import { FOLLOW_UP_MAX_WORDS, followUpsOf, shouldAskFollowUp } from "../followUps";

describe("follow-ups", () => {
  test("reads each question's follow-up, null when there is none", () => {
    expect(
      followUpsOf([{ text: "Q1", follow_up: " What did that feel like? " }, { text: "Q2" }, "Q3", { text: "Q4", follow_up: "  " }]),
    ).toEqual(["What did that feel like?", null, null, null]);
  });

  test("asked after a short answer", () => {
    expect(shouldAskFollowUp({ followUp: "Tell me more?", alreadyAsked: false, answer: "Okay lang ko." })).toBe(true);
  });

  test("not asked after a long answer, a second time, with no answer, or when there is none", () => {
    const long = Array.from({ length: FOLLOW_UP_MAX_WORDS }, () => "word").join(" ");
    expect(shouldAskFollowUp({ followUp: "Tell me more?", alreadyAsked: false, answer: long })).toBe(false);
    expect(shouldAskFollowUp({ followUp: "Tell me more?", alreadyAsked: true, answer: "Okay." })).toBe(false);
    expect(shouldAskFollowUp({ followUp: "Tell me more?", alreadyAsked: false, answer: "  " })).toBe(false);
    expect(shouldAskFollowUp({ followUp: null, alreadyAsked: false, answer: "Okay." })).toBe(false);
  });
});
