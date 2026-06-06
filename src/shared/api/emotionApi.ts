const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

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
  }[];
  total_questions: number;
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
    fer_emotion: string | null;
    ser_emotion: string | null;
    combined_emotion: string;
  }[];
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
