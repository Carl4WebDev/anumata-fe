export type Emotion = 'Angry' | 'Happy' | 'Neutral' | 'Sad';

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

export interface InterviewResponse {
  question: string;
  answer: string;
  fer_emotion: Emotion | null;
  fer_confidence: number;
  fer_probabilities: Record<string, number>;
  ser_emotion: Emotion | null;
  ser_confidence: number;
  ser_probabilities: Record<string, number>;
  ler_emotion: Emotion | null;
  ler_confidence: number;
  ler_probabilities: Record<string, number>;
  language_detected: string | null;
  combined_emotion: Emotion;
  facial_details: FacialDetails | null;
  audio_details: AudioDetails | null;
  text_analysis: any | null;
  frame_image: string | null;
}

export interface EmotionalSpike {
  question_index: number;
  label: string;
  emotion: Emotion;
  intensity: number;
}

export interface EmotionalEvent {
  event_number: number;
  dominant_emotion: Emotion;
  emotion_confidence: number;
  timestamp: string;
  intensity_level: 'Low' | 'Moderate' | 'High';
  question: string;
  transcript: string;
  speech_indicators: string;
  facial_indicators: string;
  summary: string;
}

export interface SessionHighlights {
  total_events: number;
  most_frequent_emotion: Emotion;
  highest_intensity_event: number | null;
  questions_with_responses: string[];
  overall_summary: string;
}

export interface EmotionSummary {
  distribution: Record<string, number>;
  indicators: string[];
}

export interface Session {
  session_id: string;
  patient_id: string;
  therapist_id: string;
  transcript: InterviewResponse[];
  emotion_summary: EmotionSummary;
  risk_level: 'Low' | 'Moderate' | 'High';
  emotional_spikes: EmotionalSpike[];
  emotional_events: EmotionalEvent[];
  session_highlights: SessionHighlights | null;
  notes: string;
  created_at: string;
  patient_name?: string;
  template_name?: string;
}

export interface MappedSession {
  id: string;
  patientId: string;
  patientName: string;
  templateName: string;
  date: string;
  duration: string;
  riskLevel: string;
  indicators: string[];
  emotions: Record<string, number>;
  spikes: {
    questionIndex: number;
    label: string;
    emotion: string;
    intensity: number;
  }[];
  responses: {
    question: string;
    answer: string;
    emotion: string;
    emotionPct: number;
    fer_confidence: number;
    ser_confidence: number;
    ler_confidence: number;
    ler_emotion: string | null;
    ler_probabilities: Record<string, number> | null;
    language_detected: string | null;
    facial_details: FacialDetails | null;
    audio_details: AudioDetails | null;
    text_analysis: any | null;
    frame_image: string | null;
  }[];
  emotionalEvents: EmotionalEvent[];
  sessionHighlights: SessionHighlights | null;
  notes: string;
}
