import { describe, test, expect } from "vitest";
import { countWords, mostSeen, percentOf, usualPercent } from "./faceAndWordMeasurements";

describe("face and word measurements", () => {
  test("usual likelihood is the session average, ignoring answers the model did not read", () => {
    expect(usualPercent([{ Sad: 0.6 }, { sad: 0.2 }, null, { Happy: 1 }], "Sad")).toBe(40);
  });

  test("one reading has nothing to compare with", () => {
    expect(usualPercent([{ Sad: 0.6 }, null], "Sad")).toBeNull();
  });

  test("likelihood of one answer", () => {
    expect(percentOf({ Sad: 0.587 }, "sad")).toBe(59);
    expect(percentOf(null, "Sad")).toBe(0);
  });

  test("counts words, but not the placeholder for no speech", () => {
    expect(countWords("  Lisod kaayo ang  akong semana ")).toBe(5);
    expect(countWords("[No speech detected]")).toBeNull();
    expect(countWords("[Audio response recorded]")).toBeNull();
    expect(countWords("")).toBeNull();
  });

  test("the emotion seen in the most frames", () => {
    expect(mostSeen({ analysed: 5, face_found: 5, counts: { Neutral: 1, Sad: 3, Happy: 1 }, changes: 2 })).toEqual(["Sad", 3]);
    expect(mostSeen({ analysed: 2, face_found: 0, counts: {}, changes: 0 })).toBeNull();
  });
});
