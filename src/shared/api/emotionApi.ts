const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

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

export interface PerQuestionResult {
  question_index: number;
  fer: { emotion: string; confidence: number; probabilities: Record<string, number>; facial_details?: FacialDetails | null } | null;
  ser: { emotion: string; confidence: number; probabilities: Record<string, number>; audio_details?: AudioDetails | null } | null;
  ler: { emotion: string; confidence: number; probabilities: Record<string, number>; language_detected?: string | null } | null;
  combined_emotion: string;
  transcript_text?: string;
  text_analysis?: TextAnalysis | null;
  frame_image?: string | null;
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
  per_question: PerQuestionResult[];
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
    ler_emotion: string | null;
    ler_confidence?: number;
    ler_probabilities?: Record<string, number>;
    language_detected?: string | null;
    combined_emotion: string;
    fer_probabilities?: Record<string, number>;
    ser_probabilities?: Record<string, number>;
    facial_details?: FacialDetails | null;
    audio_details?: AudioDetails | null;
    text_analysis?: TextAnalysis | null;
    frame_image?: string | null;
  }[];
  emotional_events?: EmotionalEvent[];
  session_highlights?: SessionHighlights;
  created_at: string;
}

export type AnalysisStage = "answers" | "report" | "done" | "failed";

export type AnalysisStatus =
  | { status: "processing"; elapsed_s: number; progress: { stage: AnalysisStage; done: number; total: number } | null }
  | { status: "completed"; elapsed_s: number; result: EmotionResult }
  | { status: "failed"; elapsed_s: number; error: { message: string; code: string } }
  | { status: "not_started" };

/** The server no longer has the early-uploaded answers; send everything again. */
export class StagedFilesMissingError extends Error {
  constructor() {
    super("Some early-uploaded recordings are missing");
    this.name = "StagedFilesMissingError";
  }
}

export const emotionApi = {
  /**
   * Early upload: send one finished answer's recordings while the patient
   * carries on, so the final upload is small.
   */
  async stageFiles(token: string, files: File[]): Promise<void> {
    const formData = new FormData();
    for (const file of files) formData.append("files", file);
    const response = await fetch(`${API_BASE}/api/emotion/token/${token}/staged-files`, {
      method: "POST",
      body: formData,
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.message || "Couldn't upload the answer early");
    }
  },

  /**
   * Upload the interview and start its analysis. Returns as soon as the
   * server has the files — the analysis runs in the background; follow it
   * with analysisStatus(). `staged` names files already sent with stageFiles().
   */
  async startAnalysis(token: string, files: File[], staged: string[] = []): Promise<void> {
    const formData = new FormData();
    if (staged.length > 0) formData.append("staged", JSON.stringify(staged));
    for (const file of files) {
      formData.append("files", file);
    }

    const response = await fetch(`${API_BASE}/api/emotion/token/${token}/analyze`, {
      method: "POST",
      body: formData,
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (data.code === "STAGED_FILES_MISSING") throw new StagedFilesMissingError();
      throw new Error(data.message || "Couldn't upload the interview");
    }
  },

  async analysisStatus(token: string): Promise<AnalysisStatus> {
    const response = await fetch(`${API_BASE}/api/emotion/token/${token}/analysis-status`, {
      signal: AbortSignal.timeout(15000),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || "Couldn't check the analysis");
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
