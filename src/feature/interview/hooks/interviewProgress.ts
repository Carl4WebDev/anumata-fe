import type { ResponseLanguage } from "./rapportUtils";

/**
 * Where the patient is in the formal interview, saved after every answer so a
 * refresh or crashed tab can pick up from the last question.
 *
 * sessionStorage, on purpose: it survives a reload (and a restored tab) but
 * not closing the tab, so answers don't linger on a shared device. The
 * recordings themselves are kept in IndexedDB (fileStorage.addFiles).
 */

export interface InterviewProgress {
  /** The question to ask on resume (the one that was interrupted). */
  nextIndex: number;
  /** Transcribed answers so far, by question index. */
  answers: Record<number, string>;
  lang: ResponseLanguage;
  /** Interview seconds so far. */
  elapsed: number;
  rapportResponses: { question: string; answer: string; acknowledgment: string }[];
  /** The crisis help card was shown — keep showing it after the reload. */
  crisis: boolean;
  savedAt: number;
}

// A patient coming back much later starts fresh.
export const PROGRESS_MAX_AGE_MS = 6 * 60 * 60 * 1000;

const key = (token: string) => `amumata_progress_${token}`;
const LANGS: ResponseLanguage[] = ["en", "tl", "ceb"];

export function saveProgress(token: string, progress: InterviewProgress): void {
  try {
    sessionStorage.setItem(key(token), JSON.stringify(progress));
  } catch {
    /* storage blocked — the interview works, it just can't be resumed */
  }
}

export function loadProgress(token: string, now = Date.now()): InterviewProgress | null {
  try {
    const p = JSON.parse(sessionStorage.getItem(key(token)) ?? "null");
    const valid =
      p &&
      Number.isInteger(p.nextIndex) &&
      p.nextIndex >= 0 &&
      typeof p.answers === "object" &&
      LANGS.includes(p.lang) &&
      typeof p.elapsed === "number" &&
      Array.isArray(p.rapportResponses) &&
      typeof p.savedAt === "number";
    if (!valid || now - p.savedAt > PROGRESS_MAX_AGE_MS) return null;
    return { ...p, crisis: p.crisis === true };
  } catch {
    return null;
  }
}

export function clearProgress(token: string): void {
  try {
    sessionStorage.removeItem(key(token));
  } catch {
    /* ignore */
  }
}
