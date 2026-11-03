/** One question being written in the Add / Edit forms, with its optional follow-up. */
export interface DraftQuestion {
  text: string;
  followUp: string;
}

export const MIN_QUESTIONS = 3;
export const MAX_QUESTIONS = 10;

export const emptyQuestions = (count: number): DraftQuestion[] =>
  Array.from({ length: count }, () => ({ text: "", followUp: "" }));

/** The filled-in questions, as the question-set API takes them (each follow-up stays with its question). */
export function toQuestionSetData(questions: DraftQuestion[]) {
  const filled = questions.filter((q) => q.text.trim());
  return { questions: filled.map((q) => q.text.trim()), followUps: filled.map((q) => q.followUp.trim()) };
}
