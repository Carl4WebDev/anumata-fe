import { describe, test, expect } from "vitest";
import { parseVoiceCommand, normalizeUtterance, isExplicitDone } from "../voiceCommands";

describe("isExplicitDone — ends an answer without a check-in", () => {
  test.each(["Done.", "Next question please", "Tapos na po.", "Human na ko.", "That's all.", "Mao ra to.", "Wala na po.", "I'm done"])(
    "'%s' ends the answer",
    (text) => {
      expect(isExplicitDone(text)).toBe(true);
    },
  );

  test.each(["Oo.", "Okay lang.", "Ayos lang.", "Yes.", "Sige.", "Hindi.", "No.", "Okay so next week my mother visits"])(
    "'%s' is just an answer",
    (text) => {
      expect(isExplicitDone(text)).toBe(false);
    },
  );
});

describe("normalizeUtterance", () => {
  test("strips punctuation and apostrophes", () => {
    expect(normalizeUtterance("I'm done.")).toBe("im done");
    expect(normalizeUtterance("  Oo,   sige!! ")).toBe("oo sige");
  });
});

describe("parseVoiceCommand", () => {
  test.each([
    ["Yes.", "yes"],
    ["Yes, I'm done.", "yes"],
    ["Okay lang.", "yes"],
    ["Next question please", "yes"],
    ["That's all.", "yes"],
    ["Oo.", "yes"],
    ["Opo, tapos na po.", "yes"],
    ["Sige na.", "yes"],
    ["Human na ko.", "yes"],
    ["Mao ra to.", "yes"],
    ["Wala na po.", "yes"],
    ["Ready na ako", "yes"],
    ["Andam na ko", "yes"],
  ])("'%s' → yes", (text, expected) => {
    expect(parseVoiceCommand(text)).toBe(expected);
  });

  test.each([
    ["No.", "no"],
    ["Not yet.", "no"],
    ["Wait.", "no"],
    ["Teka lang.", "no"],
    ["Hindi pa po.", "no"],
    ["Wala pa.", "no"],
    ["Kadali lang.", "no"],
    ["Dili pa.", "no"],
    ["Wait, I'm still talking", "no"],
  ])("'%s' → no", (text, expected) => {
    expect(parseVoiceCommand(text)).toBe(expected);
  });

  test.each([
    ["Repeat the question.", "repeat"],
    ["Can you say that again?", "repeat"],
    ["Pakiulit po.", "repeat"],
    ["Ano ulit?", "repeat"],
    ["Usba ra.", "repeat"],
    ["Unsa to?", "repeat"],
  ])("'%s' → repeat", (text, expected) => {
    expect(parseVoiceCommand(text)).toBe(expected);
  });

  test.each([
    "Okay so next week my mother is coming home and I'm nervous about it.",
    "Okay naman ang trabaho pero pagod ako lagi",
    "I was not okay yesterday",
    "Oo pero medyo malungkot ako",
    "My family",
    "",
  ])("ordinary speech is not a command: '%s'", (text) => {
    expect(parseVoiceCommand(text)).toBeNull();
  });
});
