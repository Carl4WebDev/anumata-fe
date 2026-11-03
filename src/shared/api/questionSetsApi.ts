import { httpClient } from "./httpClient";
import { runAiJob } from "./aiJobs";

// =============================================================================
// Types — Question Set CRUD
// =============================================================================

export interface SetQuestion {
  text: string;
  order: number;
  follow_up?: string;
}

export interface QuestionSet {
  question_set_id: number;
  therapist_id: number;
  name: string;
  description: string;
  /** `follow_up`: optional therapist-written prompt, asked once when the answer is short. */
  questions: SetQuestion[];
  created_at: string;
  updated_at?: string;
}

// =============================================================================
// Types — AI-Assisted Question Set Development
// =============================================================================

/** A single AI-generated draft question. */
export interface AiGeneratedQuestion {
  order: number;
  text: string;
  purpose: string;
  category: string;
  /** Optional follow-up the therapist adds before saving. */
  follow_up?: string;
}

/** Response from POST /api/question-sets/ai/generate */
export interface AiGenerateResponse {
  title: string;
  description: string;
  language: string;
  questions: AiGeneratedQuestion[];
}

/** A quality issue found by the AI reviewer. */
export interface AiQuestionIssue {
  question_order: number;
  issue_type: string;
  explanation: string;
  suggested_revision: string;
}

/** Response from POST /api/question-sets/ai/review */
export interface AiReviewResponse {
  overall_quality: string;
  issues: AiQuestionIssue[];
}

/** Response from POST /api/question-sets/ai/refine */
export interface AiRefineResponse {
  original: string;
  revised: string;
  reason: string;
}

// =============================================================================
// API Client
// =============================================================================

export const questionSetsApi = {
  // --- Standard CRUD ---

  getAll() {
    return httpClient.get<QuestionSet[]>("/api/question-sets");
  },

  getById(id: number) {
    return httpClient.get<QuestionSet>(`/api/question-sets/${id}`);
  },

  create(data: { name: string; description?: string; questions: string[] | { text: string; order?: number; follow_up?: string }[] }) {
    return httpClient.post<QuestionSet>("/api/question-sets", data);
  },

  update(id: number, data: { name?: string; description?: string; questions?: string[] | { text: string; order?: number; follow_up?: string }[] }) {
    return httpClient.patch<QuestionSet>(`/api/question-sets/${id}`, data);
  },

  remove(id: number) {
    return httpClient.delete<{ deleted: boolean }>(`/api/question-sets/${id}`);
  },

  createWithItems(data: {
    name: string;
    description?: string;
    items: { source_type: "standardized" | "custom"; standardized_question_id?: number; custom_question_id?: number }[];
  }) {
    return httpClient.post<QuestionSet>("/api/question-sets/with-items", data);
  },

  getItems(id: number) {
    return httpClient.get(`/api/question-sets/${id}/items`);
  },

  // --- AI-Assisted ---

  /** Generate draft questions via AI. Does NOT save to DB. */
  aiGenerate(data: {
    title: string;
    focus: string;
    description?: string;
    num_questions?: number;
    language?: string;
    additional_instructions?: string;
  }) {
    return runAiJob<AiGenerateResponse>("/api/question-sets/ai/generate", data);
  },

  /** Review draft questions for quality issues via AI. */
  aiReview(data: { questions: { order: number; text: string }[]; focus?: string }) {
    return runAiJob<AiReviewResponse>("/api/question-sets/ai/review", data);
  },

  /** Refine/improve a single question via AI. */
  aiRefine(data: { question_text: string }) {
    return runAiJob<AiRefineResponse>("/api/question-sets/ai/refine", data);
  },
};
