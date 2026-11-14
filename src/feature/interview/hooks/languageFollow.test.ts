import { describe, test, expect } from "vitest";
import { followLanguage } from "./languageFollow";

describe("followLanguage", () => {
  test("switches only after two answers in a row in the new language", () => {
    const first = followLanguage("en", "Okay lang naman ako ngayon", "tl", null);
    expect(first).toEqual({ lang: "en", pending: "tl" });
    const second = followLanguage("en", "Medyo pagod lang talaga ako", "tl", first.pending);
    expect(second).toEqual({ lang: "tl", pending: null });
  });

  test("one answer in another language, then back: no switch", () => {
    const first = followLanguage("tl", "I have been sleeping well lately", "en", null);
    expect(first.pending).toBe("en");
    expect(followLanguage("tl", "Okay lang naman ako ngayon", "tl", first.pending)).toEqual({ lang: "tl", pending: null });
  });

  test("Bisaya is followed too", () => {
    const first = followLanguage("en", "Maayo ra man ko karon", "ceb", null);
    expect(followLanguage("en", "Kapoy kaayo ko karon nga semana", "ceb", first.pending).lang).toBe("ceb");
  });

  test("very short answers don't count", () => {
    expect(followLanguage("en", "oo po", "tl", null)).toEqual({ lang: "en", pending: null });
    expect(followLanguage("en", "oo po", "tl", "tl")).toEqual({ lang: "en", pending: "tl" });
  });
});
