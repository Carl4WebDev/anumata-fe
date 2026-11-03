import type { FaceFrames } from "../../../shared/api/sessionsApi";

/** The face reading of one answer: the frames behind it and how it compares with the patient's usual. */
export interface FaceMeasures {
  frames: FaceFrames | null;
  /** Likelihood (0-100) of the detected emotion in this answer, and its session average. */
  percent: number;
  usualPercent: number | null;
}

/** The word reading of one answer, read from its transcript. */
export interface WordMeasures {
  wordCount: number | null;
  percent: number;
  usualPercent: number | null;
}

type Probabilities = Record<string, number> | null | undefined;

/** A probability (0-1) for `emotion`, whatever the key's casing. */
function probabilityOf(probabilities: Probabilities, emotion: string): number | null {
  if (!probabilities) return null;
  const key = Object.keys(probabilities).find((k) => k.toLowerCase() === emotion.toLowerCase());
  return key === undefined ? null : probabilities[key];
}

/**
 * The patient's usual likelihood (0-100) of `emotion` this session: the
 * average over every answer the model read. Null with fewer than two readings,
 * since one answer has nothing to be compared with.
 */
export function usualPercent(allProbabilities: Probabilities[], emotion: string): number | null {
  const values = allProbabilities.map((p) => probabilityOf(p, emotion)).filter((v): v is number => v !== null);
  if (values.length < 2) return null;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100);
}

/** Likelihood (0-100) of `emotion` in one answer, or 0 when the model gave none. */
export function percentOf(probabilities: Probabilities, emotion: string): number {
  return Math.round((probabilityOf(probabilities, emotion) ?? 0) * 100);
}

/** Words in a transcript; null for the placeholders stored when nothing was transcribed, e.g. "[No speech detected]". */
export function countWords(answer: string | null | undefined): number | null {
  const text = (answer ?? "").trim();
  if (!text || /^\[.*\]$/.test(text)) return null;
  return text.split(/\s+/).length;
}

/** The emotion read in the most frames, e.g. ["Sad", 3]; null when no face was read. */
export function mostSeen(frames: FaceFrames): [string, number] | null {
  const [top] = Object.entries(frames.counts).sort((a, b) => b[1] - a[1]);
  return top ?? null;
}
