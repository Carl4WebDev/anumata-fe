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

export interface FacialDetails {
  brows: string;
  eyes: string;
  mouth: string;
  jaw: string;
  description: string;
}

export interface AudioDetails {
  pitch_mean_hz: number;
  pitch_std_hz: number;
  pitch_label: string;
  energy_rms: number;
  energy_label: string;
  speech_rate: string;
  pitch_variability: string;
  description: string;
}

export interface TextAnalysis {
  keywords: string[];
  positive_keywords: string[];
  intensifiers_used: string[];
  negative_count: number;
  positive_count: number;
  intensifier_count: number;
  description: string;
}

export interface TranscriptEntry {
  question: string;
  answer: string;
  fer_emotion?: string | null;
  fer_confidence?: number;
  fer_probabilities?: Record<string, number>;
  ser_emotion?: string | null;
  ser_confidence?: number;
  ser_probabilities?: Record<string, number>;
  combined_emotion?: string;
  facial_details?: FacialDetails | null;
  audio_details?: AudioDetails | null;
  text_analysis?: TextAnalysis | null;
  frame_image?: string | null;
}

export interface SessionData {
  session_id: number;
  interview_link_id: number;
  patient_id: number;
  patient_name: string;
  therapist_id: number;
  template_name: string;
  transcript: TranscriptEntry[];
  emotion_summary: { distribution?: Record<string, number>; indicators?: string[]; happy?: number; sad?: number; angry?: number; neutral?: number };
  risk_level: string;
  emotional_spikes: { questionIndex?: number; question_index?: number; label: string; emotion: string; intensity: number }[];
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
