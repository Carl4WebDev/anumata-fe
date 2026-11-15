import type { KnowledgeEntry } from "../data/assistantKnowledge";

/** One question asked in "Ask Amumata" and what came back. Kept only until the page closes. */
export interface AssistantTurn {
  id: number;
  question: string;
  /** Best-matching entries, shown at once; the first ones were sent to the AI, numbered [1], [2], ... */
  matches: KnowledgeEntry[];
  status: "thinking" | "answered" | "failed";
  answer?: string;
  found?: boolean;
  /** 1-based numbers of the entries the answer cites. */
  sources?: number[];
  error?: string;
}

export type AnswerPart = { kind: "text"; text: string } | { kind: "cite"; n: number };

/** The answer split into plain text and [n] citations, so citations can be shown as badges. */
export function splitCitations(answer: string): AnswerPart[] {
  return answer
    .split(/(\[\d{1,2}\])/)
    .filter(Boolean)
    .map((piece) => {
      const cite = /^\[(\d{1,2})\]$/.exec(piece);
      return cite ? { kind: "cite", n: Number(cite[1]) } : { kind: "text", text: piece };
    });
}

/** The entries an answer was based on: the cited ones, or all matches when the AI cited none. */
export function basedOn(turn: AssistantTurn): KnowledgeEntry[] {
  const cited = (turn.sources ?? []).map((n) => turn.matches[n - 1]).filter((entry): entry is KnowledgeEntry => Boolean(entry));
  return turn.status === "answered" && turn.found && cited.length > 0 ? cited : turn.matches;
}
