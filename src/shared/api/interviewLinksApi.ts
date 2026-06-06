import { httpClient } from "./httpClient";

export interface InterviewLink {
  interview_link_id: number;
  token: string;
  status: string;
  patient_id: number;
  patient_name: string;
  question_set_id: number;
  question_set_name: string;
  questions?: { text: string; order: number }[];
  created_at: string;
  updated_at?: string;
}

export const interviewLinksApi = {
  getAll(params?: { status?: string; page?: number; limit?: number }) {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set("status", params.status);
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    const qs = searchParams.toString();
    return httpClient.get<InterviewLink[]>(`/api/interview-links${qs ? `?${qs}` : ""}`);
  },

  create(data: { patient_id: number; question_set_id: number }) {
    return httpClient.post<InterviewLink>("/api/interview-links", data);
  },

  getByToken(token: string) {
    return httpClient.get<InterviewLink>(`/api/interview-links/token/${token}`);
  },

  startInterview(token: string) {
    return httpClient.post<InterviewLink>(`/api/interview-links/token/${token}/start`);
  },

  completeInterview(token: string) {
    return httpClient.post<InterviewLink>(`/api/interview-links/token/${token}/complete`);
  },

  updateStatus(id: number, status: string) {
    return httpClient.patch<InterviewLink>(`/api/interview-links/${id}/status`, { status });
  },

  remove(id: number) {
    return httpClient.delete<{ deleted: boolean }>(`/api/interview-links/${id}`);
  },
};
