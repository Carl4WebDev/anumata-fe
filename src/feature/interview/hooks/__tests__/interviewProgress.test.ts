import { describe, test, expect, beforeEach, vi, afterEach } from "vitest";
import { saveProgress, loadProgress, clearProgress, PROGRESS_MAX_AGE_MS, type InterviewProgress } from "../interviewProgress";

const progress = (overrides: Partial<InterviewProgress> = {}): InterviewProgress => ({
  nextIndex: 3,
  answers: { 0: "Hindi ako makatulog", 1: "Musika", 2: "" },
  lang: "tl",
  elapsed: 412,
  rapportResponses: [{ question: "Kumusta ka?", answer: "Okay lang", acknowledgment: "Salamat" }],
  crisis: false,
  savedAt: 1_000,
  ...overrides,
});

beforeEach(() => sessionStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe("interview progress", () => {
  test("is saved per interview and read back after a refresh", () => {
    saveProgress("tok", progress());
    expect(loadProgress("tok", 2_000)).toEqual(progress());
    expect(loadProgress("other", 2_000)).toBeNull();
  });

  test("old progress is ignored (the patient left hours ago)", () => {
    saveProgress("tok", progress({ savedAt: 0 }));
    expect(loadProgress("tok", PROGRESS_MAX_AGE_MS + 1)).toBeNull();
  });

  test("cleared when the interview finishes or starts over", () => {
    saveProgress("tok", progress());
    clearProgress("tok");
    expect(loadProgress("tok", 2_000)).toBeNull();
  });

  test("damaged or unexpected data is ignored instead of breaking the page", () => {
    sessionStorage.setItem("amumata_progress_tok", "{not json");
    expect(loadProgress("tok", 2_000)).toBeNull();
    sessionStorage.setItem("amumata_progress_tok", JSON.stringify({ nextIndex: "three" }));
    expect(loadProgress("tok", 2_000)).toBeNull();
    sessionStorage.setItem("amumata_progress_tok", JSON.stringify({ ...progress(), lang: "fr" }));
    expect(loadProgress("tok", 2_000)).toBeNull();
  });

  test("blocked storage (private mode) never throws", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(() => saveProgress("tok", progress())).not.toThrow();
    expect(loadProgress("tok", 2_000)).toBeNull();
  });
});

describe("interview progress — mood before", () => {
  test("keeps a valid mood and drops an invalid one", () => {
    const base = { nextIndex: 1, answers: {}, lang: "en" as const, elapsed: 5, rapportResponses: [], crisis: false, savedAt: Date.now() };
    saveProgress("t1", { ...base, moodBefore: 2 });
    expect(loadProgress("t1")?.moodBefore).toBe(2);
    saveProgress("t2", { ...base, moodBefore: 9 });
    expect(loadProgress("t2")?.moodBefore).toBeUndefined();
  });
});
