import { describe, test, expect } from "vitest";
import { emotionCues } from "./emotionCues";

describe("emotionCues", () => {
  test("angry face cues match the therapist-facing description", () => {
    expect(emotionCues("Angry", "face")).toEqual([
      "scowl",
      "glare",
      "sneer",
      "furrowed brow",
      "clenched jaw",
      "flared nostrils",
      "curled lip",
    ]);
  });

  test("covers every face model label, case-insensitively and with variants", () => {
    for (const label of ["angry", "disgust", "fear", "happy", "sad", "surprise", "neutral"]) {
      expect(emotionCues(label, "face").length).toBeGreaterThan(0);
    }
    expect(emotionCues("FEARFUL", "face")).toEqual(emotionCues("fear", "face"));
    expect(emotionCues(" surprised ", "face")).toEqual(emotionCues("surprise", "face"));
  });

  test("voice cues differ from face cues", () => {
    expect(emotionCues("sad", "voice")).toContain("lower pitch");
    expect(emotionCues("sad", "face")).toContain("lip corners turned down");
  });

  test("unknown or missing labels give no cues", () => {
    expect(emotionCues(null, "face")).toEqual([]);
    expect(emotionCues("mixed", "face")).toEqual([]);
  });
});
