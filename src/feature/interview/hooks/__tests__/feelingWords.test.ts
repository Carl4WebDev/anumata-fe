import { describe, test, expect } from "vitest";
import { FEELING_WORDS, feelingLabel, toggleFeeling } from "../feelingWords";

describe("feeling words", () => {
  test("a tap adds a word, a second tap removes it", () => {
    expect(toggleFeeling([], "sad")).toEqual(["sad"]);
    expect(toggleFeeling(["sad", "tired"], "sad")).toEqual(["tired"]);
  });

  test("at most three per question", () => {
    expect(toggleFeeling(["sad", "tired", "lonely"], "angry")).toEqual(["sad", "tired", "lonely"]);
  });

  test("every word has all three languages, and the therapist sees English", () => {
    for (const w of FEELING_WORDS) expect(w.label.en && w.label.tl && w.label.ceb).toBeTruthy();
    expect(feelingLabel("worried")).toEqual({ face: "😟", label: "Worried" });
    expect(feelingLabel("unknown")).toBeNull();
  });
});
