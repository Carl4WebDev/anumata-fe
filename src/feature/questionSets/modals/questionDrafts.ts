/** One question being written in the Add / Edit forms, with its optional follow-up and sensitive mark. */
export interface DraftQuestion {
  text: string;
  followUp: string;
  /** Personal / hard topic: Amumata says a soft line before it and checks in sooner. */
  sensitive: boolean;
}

export const MIN_QUESTIONS = 3;
export const MAX_QUESTIONS = 10;

export const emptyQuestion = (): DraftQuestion => ({ text: "", followUp: "", sensitive: false });

export const emptyQuestions = (count: number): DraftQuestion[] => Array.from({ length: count }, emptyQuestion);

/** The filled-in questions, as the question-set API takes them (follow-ups and marks stay with their question). */
export function toQuestionSetData(questions: DraftQuestion[]) {
  const filled = questions.filter((q) => q.text.trim());
  return {
    questions: filled.map((q) => q.text.trim()),
    followUps: filled.map((q) => q.followUp.trim()),
    sensitives: filled.map((q) => q.sensitive),
  };
}
