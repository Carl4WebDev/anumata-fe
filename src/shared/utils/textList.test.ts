import { describe, test, expect } from "vitest";
import { asTextList, withTextLists } from "./textList";

describe("asTextList", () => {
  test("a sentence from the AI becomes a one-item list", () => {
    expect(asTextList("Not applicable — only one session.")).toEqual(["Not applicable — only one session."]);
  });

  test("missing or empty values become an empty list", () => {
    expect(asTextList(null)).toEqual([]);
    expect(asTextList(undefined)).toEqual([]);
    expect(asTextList(["", "  "])).toEqual([]);
  });

  test("objects inside a list become readable text", () => {
    expect(asTextList([{ area: "Relationships", why: "Mentioned often" }, "Sleep"])).toEqual([
      "Relationships — Mentioned often",
      "Sleep",
    ]);
  });
});

describe("withTextLists", () => {
  test("fixes only the named fields and leaves the rest", () => {
    const report = { overall_summary: "Steady.", limitations: "One session only." as unknown as string[] };
    expect(withTextLists(report, ["limitations"])).toEqual({ overall_summary: "Steady.", limitations: ["One session only."] });
  });
});
