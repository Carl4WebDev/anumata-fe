import { createContext } from "react";

export interface QuestionSetData {
  name: string;
  description: string;
  questions: string[];
  /** Optional follow-up per question (same order; "" = none). */
  followUps?: string[];
}

/** A set built by picking standardized / custom questions. */
export interface QuestionSetItemsData {
  name: string;
  description?: string;
  items: { source_type: "standardized" | "custom"; standardized_question_id?: number; custom_question_id?: number }[];
}

export interface QuestionSetsValue {
  questionSets: any[];
  loading: boolean;
  error: string | null;
  clearError: () => void;
  addQuestionSet: (data: QuestionSetData) => Promise<{ ok: boolean; data?: unknown }>;
  addQuestionSetWithItems: (data: QuestionSetItemsData) => Promise<{ ok: boolean; data?: unknown; message?: string }>;
  updateQuestionSet: (id: number, data: QuestionSetData) => Promise<void>;
  /** Resolves false if the server refused (the set is put back). */
  removeQuestionSet: (id: number) => Promise<boolean>;
}

export const QuestionSetsContext = createContext<QuestionSetsValue | null>(null);
