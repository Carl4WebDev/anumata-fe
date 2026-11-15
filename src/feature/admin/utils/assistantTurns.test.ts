import { describe, expect, test } from "vitest";
import type { KnowledgeEntry } from "../data/assistantKnowledge";
import { basedOn, splitCitations, type AssistantTurn } from "./assistantTurns";

const entry = (id: string): KnowledgeEntry => ({ id, source: "Guide", title: id, text: `${id} text` });
const matches = [entry("a"), entry("b"), entry("c")];

describe("splitCitations", () => {
  test("turns [n] into citation parts and keeps the text around them", () => {
    expect(splitCitations("Fusion is 50/50 [1]. SER is 78.95% [2][3].")).toEqual([
      { kind: "text", text: "Fusion is 50/50 " },
      { kind: "cite", n: 1 },
      { kind: "text", text: ". SER is 78.95% " },
      { kind: "cite", n: 2 },
      { kind: "cite", n: 3 },
      { kind: "text", text: "." },
    ]);
  });

  test("an answer without citations is one text part", () => {
    expect(splitCitations("No citations here.")).toEqual([{ kind: "text", text: "No citations here." }]);
  });
});

describe("basedOn", () => {
  const turn = (patch: Partial<AssistantTurn>): AssistantTurn => ({ id: 1, question: "q", matches, status: "answered", found: true, ...patch });

  test("an answer is based on the entries it cites", () => {
    expect(basedOn(turn({ sources: [3, 1] })).map((e) => e.id)).toEqual(["c", "a"]);
  });

  test("no valid citation, not found, still thinking or failed → all matching entries", () => {
    expect(basedOn(turn({ sources: [] }))).toEqual(matches);
    expect(basedOn(turn({ sources: [9] }))).toEqual(matches);
    expect(basedOn(turn({ found: false, sources: [1] }))).toEqual(matches);
    expect(basedOn(turn({ status: "thinking" }))).toEqual(matches);
    expect(basedOn(turn({ status: "failed" }))).toEqual(matches);
  });
});
