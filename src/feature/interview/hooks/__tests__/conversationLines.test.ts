import { describe, test, expect } from "vitest";
import { closingLine, transitionLine, voiceTips, ANSWER_ACKNOWLEDGMENTS, HALFWAY_LINE, REASSURANCE_LINE } from "../conversationLines";

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

describe("voice tips and reassurance", () => {
  test("the tip says how long to pause, in the patient's language", () => {
    expect(voiceTips("en", 3)).toMatch(/^Pause for 3 seconds/);
    expect(voiceTips("tl", 7)).toMatch(/^Huminto ng 7 segundo/);
  });

  test("the reassurance says who sees the answers, in all three languages", () => {
    expect(REASSURANCE_LINE.en).toMatch(/only your therapist/);
    expect(REASSURANCE_LINE.tl).toMatch(/therapist mo lang/);
    expect(REASSURANCE_LINE.ceb).toMatch(/therapist ra/);
  });
});

describe("closingLine — what happens next", () => {
  test("names the next appointment in Philippine time when one is booked", () => {
    // 01:00Z = 9:00 AM in Manila.
    expect(closingLine("Maria", "en", "2026-11-16T01:00:00.000Z")).toBe(
      "Thank you so much, Maria. Sharing how you feel takes courage. I'm saving your answers now. Your therapist will go over them with you on Monday, November 16 at 9:00 AM.",
    );
    expect(closingLine("Maria", "ceb", "2026-11-16T01:00:00.000Z")).toContain("sa Monday, November 16 at 9:00 AM.");
  });

  test("without an appointment it still says the therapist will go over the answers", () => {
    expect(closingLine("", "tl")).toMatch(/Pag-uusapan ninyo ito ng therapist mo\.$/);
  });
});
