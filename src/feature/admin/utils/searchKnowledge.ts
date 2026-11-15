/**
 * Finds the info-page entries that best match a question (BM25 ranking over
 * title, keywords and text). Runs in the browser, so matches show instantly;
 * the best few are then sent to the AI to write an answer from.
 */

import type { KnowledgeEntry } from "../data/assistantKnowledge";

export interface KnowledgeMatch {
  entry: KnowledgeEntry;
  score: number;
}

const STOPWORDS = new Set(
  (
    "a an the and or but if of to in on at by for with from as is are was were be been being do does did " +
    "how what why when where which who whom whose this that these those it its i me my we our you your he she " +
    "they them their can could should would will shall may might must about into than then there here so not no " +
    "yes any all some more most very just also too only own same such up down out over again further once " +
    "has have had having am explain tell know please amumata system"
  ).split(" "),
);

/** Everyday words → the terms the info pages use. Applied to the question only. */
const SYNONYMS: Record<string, string[]> = {
  voice: ["ser", "speech"],
  tone: ["ser", "voice"],
  face: ["fer", "facial"],
  facial: ["fer", "face"],
  word: ["ler", "transcript"],
  text: ["ler"],
  accurate: ["accuracy"],
  score: ["accuracy"],
  drop: ["lower", "went"],
  private: ["privacy"],
  filipino: ["davao", "tagalog", "bisaya"],
  bisaya: ["cebuano", "ceb"],
};

const TITLE_WEIGHT = 2;
const K1 = 1.2;
const B = 0.75;

function stem(word: string): string {
  if (word.length <= 4 || /\d/.test(word)) return word;
  for (const ending of ["ing", "ies", "es", "ed", "s"]) {
    if (word.endsWith(ending) && word.length - ending.length >= 3) {
      return ending === "ies" ? `${word.slice(0, -3)}y` : word.slice(0, -ending.length);
    }
  }
  return word;
}

export function tokenize(text: string): string[] {
  const words = text.toLowerCase().replace(/[’']/g, "").match(/[a-z0-9]+(?:\.[0-9]+)?/g) ?? [];
  return words.filter((word) => !STOPWORDS.has(word)).map(stem);
}

interface IndexedEntry {
  entry: KnowledgeEntry;
  counts: Map<string, number>;
  length: number;
}

interface Index {
  docs: IndexedEntry[];
  docFrequency: Map<string, number>;
  averageLength: number;
}

const indexCache = new WeakMap<KnowledgeEntry[], Index>();

function buildIndex(entries: KnowledgeEntry[]): Index {
  const docFrequency = new Map<string, number>();
  const docs = entries.map((entry) => {
    const titleTokens = tokenize(entry.title);
    const tokens = [
      ...Array.from({ length: TITLE_WEIGHT }, () => titleTokens).flat(),
      ...tokenize((entry.keywords ?? []).join(" ")),
      ...tokenize(entry.text),
    ];
    const counts = new Map<string, number>();
    tokens.forEach((token) => counts.set(token, (counts.get(token) ?? 0) + 1));
    counts.forEach((_, token) => docFrequency.set(token, (docFrequency.get(token) ?? 0) + 1));
    return { entry, counts, length: tokens.length };
  });
  const averageLength = docs.reduce((sum, doc) => sum + doc.length, 0) / Math.max(docs.length, 1);
  return { docs, docFrequency, averageLength };
}

function indexFor(entries: KnowledgeEntry[]): Index {
  const cached = indexCache.get(entries);
  if (cached) return cached;
  const index = buildIndex(entries);
  indexCache.set(entries, index);
  return index;
}

function queryTerms(question: string): string[] {
  const base = tokenize(question);
  const extra = base.flatMap((term) => (SYNONYMS[term] ?? []).map(stem));
  return [...new Set([...base, ...extra])];
}

function bm25(doc: IndexedEntry, terms: string[], index: Index): number {
  const total = index.docs.length;
  return terms.reduce((score, term) => {
    const frequency = doc.counts.get(term) ?? 0;
    if (frequency === 0) return score;
    const df = index.docFrequency.get(term) ?? 0;
    const idf = Math.log(1 + (total - df + 0.5) / (df + 0.5));
    const norm = frequency + K1 * (1 - B + (B * doc.length) / index.averageLength);
    return score + (idf * frequency * (K1 + 1)) / norm;
  }, 0);
}

export function searchKnowledge(entries: KnowledgeEntry[], question: string, limit = 5): KnowledgeMatch[] {
  const terms = queryTerms(question);
  if (terms.length === 0) return [];
  const index = indexFor(entries);
  return index.docs
    .map((doc) => ({ entry: doc.entry, score: bm25(doc, terms, index) }))
    .filter((match) => match.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export interface Passage {
  id: string;
  source: string;
  title: string;
  text: string;
}

/** The matches, trimmed so the small AI model gets a short, focused context. */
export function toPassages(matches: KnowledgeMatch[], { perEntry = 1200, total = 5000 } = {}): Passage[] {
  const passages: Passage[] = [];
  let used = 0;
  for (const { entry } of matches) {
    const room = Math.min(perEntry, total - used);
    if (room < 200) break;
    const text = entry.text.length > room ? `${entry.text.slice(0, room).trimEnd()}…` : entry.text;
    passages.push({ id: entry.id, source: entry.source, title: entry.title, text });
    used += text.length;
  }
  return passages;
}
