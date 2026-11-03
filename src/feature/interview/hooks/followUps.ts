/**
 * Therapist-written follow-ups ("What did that feel like for you?"). One is
 * asked at most once per question, and only after a short answer — someone
 * who has already said a lot isn't asked for more. A fixed rule, so every
 * patient is treated the same way.
 */

/** An answer under this many words counts as short. */
export const FOLLOW_UP_MAX_WORDS = 40;

/** The follow-up of each question (null when it has none), from the interview link's questions. */
export function followUpsOf(questions: unknown[]): (string | null)[] {
  return questions.map((q) => {
    const followUp = typeof q === "object" && q !== null ? (q as { follow_up?: unknown }).follow_up : null;
    return typeof followUp === "string" && followUp.trim() ? followUp.trim() : null;
  });
}

export function shouldAskFollowUp({
  followUp,
  alreadyAsked,
  answer,
}: {
  followUp: string | null | undefined;
  alreadyAsked: boolean;
  answer: string;
}): boolean {
  if (!followUp || alreadyAsked) return false;
  const words = answer.trim() ? answer.trim().split(/\s+/).length : 0;
  return words > 0 && words < FOLLOW_UP_MAX_WORDS;
}
