import { describe, test, expect } from "vitest";
import { closingLine, transitionLine, ANSWER_ACKNOWLEDGMENTS, HALFWAY_LINE } from "../conversationLines";

describe("transitionLine (said after an answer, before the next question)", () => {
  test("thanks the patient after an answer", () => {
    expect(transitionLine({ answeredIndex: 0, total: 4, answered: true, lang: "en" })).toBe(ANSWER_ACKNOWLEDGMENTS[0].en);
  });

  test("varies the wording from one question to the next", () => {
    const lines = [0, 1, 2].map((i) => transitionLine({ answeredIndex: i, total: 4, answered: true, lang: "tl" }));
    expect(new Set(lines).size).toBe(3);
  });

  test("says nothing extra after a silent turn ('let's move on' was already said)", () => {
    expect(transitionLine({ answeredIndex: 1, total: 4, answered: false, lang: "en" })).toBeNull();
  });

  test("encourages the patient at the halfway point of a longer interview", () => {
    // 8 questions: after answering #4 (index 3), question #5 is the second half.
    expect(transitionLine({ answeredIndex: 3, total: 8, answered: true, lang: "ceb" })).toBe(HALFWAY_LINE.ceb);
  });

  test("no halfway line for short interviews", () => {
    expect(transitionLine({ answeredIndex: 1, total: 4, answered: true, lang: "en" })).not.toBe(HALFWAY_LINE.en);
  });

  test("every line exists in all three languages", () => {
    for (const line of [...ANSWER_ACKNOWLEDGMENTS, HALFWAY_LINE]) {
      expect(line.en && line.tl && line.ceb).toBeTruthy();
    }
  });
});

describe("closingLine", () => {
  test("thanks the patient by name", () => {
    expect(closingLine("Maria", "en")).toContain("Thank you so much, Maria.");
    expect(closingLine("Maria", "tl")).toContain("Maria");
  });

  test("reads naturally without a name", () => {
    expect(closingLine("", "en")).toMatch(/^Thank you so much\./);
  });
});
