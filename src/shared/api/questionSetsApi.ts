import { httpClient } from "./httpClient";

export interface QuestionSet {
  question_set_id: number;
  therapist_id: number;
  name: string;
  description: string;
  questions: { text: string; order: number }[];
  created_at: string;
  updated_at?: string;
}

export const questionSetsApi = {
  getAll() {
    return httpClient.get<QuestionSet[]>("/api/question-sets");
  },

  getById(id: number) {
    return httpClient.get<QuestionSet>(`/api/question-sets/${id}`);
  },

  create(data: { name: string; description?: string; questions: string[] | { text: string; order?: number }[] }) {
    return httpClient.post<QuestionSet>("/api/question-sets", data);
  },

  update(id: number, data: { name?: string; description?: string; questions?: string[] | { text: string; order?: number }[] }) {
    return httpClient.patch<QuestionSet>(`/api/question-sets/${id}`, data);
  },

  remove(id: number) {
    return httpClient.delete<{ deleted: boolean }>(`/api/question-sets/${id}`);
  },
};
