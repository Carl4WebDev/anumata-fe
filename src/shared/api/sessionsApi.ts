import { httpClient } from "./httpClient";

export interface EmotionalEvent {
  event_number: number;
  timestamp: string;
  question: string;
  transcript: string;
  dominant_emotion: string;
  emotion_confidence: number;
  speech_indicators: string;
  facial_indicators: string;
  intensity_level: string;
  summary: string;
}

export interface SessionHighlights {
  total_events: number;
  most_frequent_emotion: string;
  highest_intensity_event: number | null;
  questions_with_responses: string[];
  overall_summary: string;
}

export interface SessionData {
  session_id: number;
  interview_link_id: number;
  patient_id: number;
  patient_name: string;
  therapist_id: number;
  template_name: string;
  transcript: { question: string; answer: string }[];
  emotion_summary: { happy: number; sad: number; angry: number; neutral: number };
  risk_level: string;
  emotional_spikes: { questionIndex: number; label: string; emotion: string; intensity: number }[];
  emotional_events?: EmotionalEvent[];
  session_highlights?: SessionHighlights;
  notes: string | null;
  created_at: string;
}

export const sessionsApi = {
  getAll(params?: { page?: number; limit?: number }) {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    const qs = searchParams.toString();
    return httpClient.get<SessionData[]>(`/api/sessions${qs ? `?${qs}` : ""}`);
  },

  getById(id: number) {
    return httpClient.get<SessionData>(`/api/sessions/${id}`);
  },

  getByPatientId(patientId: number, params?: { page?: number; limit?: number }) {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    const qs = searchParams.toString();
    return httpClient.get<SessionData[]>(`/api/sessions/patient/${patientId}${qs ? `?${qs}` : ""}`);
  },

  create(data: {
    interview_link_id: number;
    transcript: { question: string; answer: string }[];
    emotion_summary: { happy: number; sad: number; angry: number; neutral: number; spikes?: unknown[] };
    risk_level: string;
  }) {
    return httpClient.post<SessionData>("/api/sessions", data);
  },

  updateNotes(id: number, notes: string) {
    return httpClient.patch<{ session_id: number; notes: string }>(`/api/sessions/${id}/notes`, { notes });
  },

  remove(id: number) {
    return httpClient.delete<{ deleted: boolean }>(`/api/sessions/${id}`);
  },
};
