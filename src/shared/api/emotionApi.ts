const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

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

export interface EmotionResult {
  session_id: number;
  risk_level: string;
  distribution: Record<string, number>;
  indicators: string[];
  spikes: {
    question_index: number;
    label: string;
    emotion: string;
    intensity: number;
  }[];
  per_question: {
    question_index: number;
    fer: { emotion: string; confidence: number; probabilities: Record<string, number> } | null;
    ser: { emotion: string; confidence: number; probabilities: Record<string, number> } | null;
    combined_emotion: string;
    transcript_text?: string;
  }[];
  total_questions: number;
  emotional_events?: EmotionalEvent[];
  session_highlights?: SessionHighlights;
}

export interface EmotionResultsResponse {
  session_id: number;
  risk_level: string;
  distribution: Record<string, number>;
  indicators: string[];
  spikes: {
    question_index: number;
    label: string;
    emotion: string;
    intensity: number;
  }[];
  transcript: {
    question: string;
    answer?: string;
    fer_emotion: string | null;
    ser_emotion: string | null;
    combined_emotion: string;
  }[];
  emotional_events?: EmotionalEvent[];
  session_highlights?: SessionHighlights;
  created_at: string;
}

export const emotionApi = {
  async analyze(token: string, files: File[]): Promise<EmotionResult> {
    const formData = new FormData();
    for (const file of files) {
      formData.append("files", file);
    }

    const response = await fetch(`${API_BASE}/api/emotion/token/${token}/analyze`, {
      method: "POST",
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Analysis failed");
    }

    return data.data;
  },

  async getResults(token: string): Promise<EmotionResultsResponse> {
    const response = await fetch(`${API_BASE}/api/emotion/token/${token}/results`);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Failed to fetch results");
    }

    return data.data;
  },
};
