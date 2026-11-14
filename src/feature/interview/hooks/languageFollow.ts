import { detectResponseLanguage, type ResponseLanguage } from "./rapportUtils";

/** Answers shorter than this ("oo", "yes po") don't say enough about the language. */
const MIN_WORDS = 3;

export interface LanguageFollow {
  /** The language to ask the next question in. */
  lang: ResponseLanguage;
  /** A different language heard once; switching needs it a second time in a row. */
  pending: ResponseLanguage | null;
}

/**
 * Follow the patient if they change language during the interview. One answer
 * in another language could be a mixed or borrowed phrase, so the questions
 * switch only after two answers in a row in the same new language.
 */
export function followLanguage(
  current: ResponseLanguage,
  answer: string,
  whisperLang: string,
  pending: ResponseLanguage | null,
): LanguageFollow {
  if (answer.trim().split(/\s+/).filter(Boolean).length < MIN_WORDS) return { lang: current, pending };
  const heard = detectResponseLanguage(answer, whisperLang);
  if (heard === current) return { lang: current, pending: null };
  if (pending === heard) return { lang: heard, pending: null };
  return { lang: current, pending: heard };
}
