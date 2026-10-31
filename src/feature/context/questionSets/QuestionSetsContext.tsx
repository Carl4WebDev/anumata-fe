import { createContext } from "react";

export interface QuestionSetData {
  name: string;
  description: string;
  questions: string[];
}

export interface QuestionSetsValue {
  questionSets: any[];
  loading: boolean;
  error: string | null;
  clearError: () => void;
  addQuestionSet: (data: QuestionSetData) => Promise<{ ok: boolean; data?: unknown }>;
  updateQuestionSet: (id: number, data: QuestionSetData) => Promise<void>;
  /** Resolves false if the server refused (the set is put back). */
  removeQuestionSet: (id: number) => Promise<boolean>;
}

export const QuestionSetsContext = createContext<QuestionSetsValue | null>(null);
