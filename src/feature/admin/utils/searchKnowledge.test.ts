import { describe, expect, test } from "vitest";
import { buildKnowledge, type KnowledgeEntry } from "../data/assistantKnowledge";
import { searchKnowledge, tokenize, toPassages } from "./searchKnowledge";

const knowledge = buildKnowledge();
const topIds = (question: string, limit = 5) => searchKnowledge(knowledge, question, limit).map((m) => m.entry.id);

describe("assistant knowledge", () => {
  test("covers every info page, with unique ids and some text", () => {
    const sources = new Set(knowledge.map((e) => e.source));
    expect([...sources].sort()).toEqual(
      ["Defense Q&A", "Guide", "How emotions work", "Interview room", "Model Evaluation", "What's New"].sort(),
    );
    expect(new Set(knowledge.map((e) => e.id)).size).toBe(knowledge.length);
    expect(knowledge.every((e) => e.title.trim() && e.text.trim())).toBe(true);
  });

  test("model results are written out as text", () => {
    const ser = knowledge.find((e) => e.id === "eval:ser");
    expect(ser?.text).toContain("Accuracy 78.95%");
  });
});

describe("searchKnowledge", () => {
  test("finds the entry that answers the question", () => {
    expect(topIds("Why did the voice accuracy drop?", 3)).toContain("qa:ser-improvement");
    expect(topIds("How is the patient's privacy protected?", 3)).toContain("qa:privacy");
    expect(topIds("How are face and voice combined?", 3)).toContain("qa:fusion");
  });

  test("keeps numbers like 78.95 whole, so they can be searched", () => {
    expect(tokenize("SER 78.95% accuracy")).toEqual(["ser", "78.95", "accuracy"]);
    const matches = searchKnowledge(knowledge, "78.95");
    expect(matches.length).toBeGreaterThan(0);
    expect(matches.every((m) => `${m.entry.title} ${m.entry.text}`.includes("78.95"))).toBe(true);
  });

  test("a question with no meaningful words finds nothing", () => {
    expect(searchKnowledge(knowledge, "")).toEqual([]);
    expect(searchKnowledge(knowledge, "what is the")).toEqual([]);
  });

  test("best match first, and never more than the limit", () => {
    const matches = searchKnowledge(knowledge, "voice model accuracy Davao", 4);
    expect(matches).toHaveLength(4);
    expect(matches.map((m) => m.score)).toEqual([...matches.map((m) => m.score)].sort((a, b) => b - a));
  });
});

describe("toPassages", () => {
  const entry = (id: string, length: number): KnowledgeEntry => ({ id, source: "Guide", title: id, text: "x".repeat(length) });

  test("trims long entries and stops at the total budget", () => {
    const matches = ["a", "b", "c", "d"].map((id) => ({ entry: entry(id, 2000), score: 1 }));
    const passages = toPassages(matches, { perEntry: 1000, total: 2500 });
    expect(passages.map((p) => p.id)).toEqual(["a", "b", "c"]);
    expect(passages[0].text).toHaveLength(1001); // 1000 characters + "…"
    expect(passages[2].text.length).toBeLessThanOrEqual(501);
  });
});
