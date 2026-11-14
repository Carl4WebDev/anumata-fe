import { httpClient } from "./httpClient";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

/** The live-viewing WebSocket on the backend: http(s)://host → ws(s)://host/ws/live. */
export function liveSocketUrl(): string {
  return `${API_BASE.replace(/^http/, "ws").replace(/\/$/, "")}/ws/live`;
}

/** What the patient's interview room reports while live. */
export interface LiveInterviewState {
  /** "warmup": getting-to-know-you; "interview": the questions; "waiting": not started yet. */
  stage?: "waiting" | "warmup" | "interview";
  questionIndex?: number;
  questionTotal?: number;
  question?: string;
  /** What the patient is saying for the current question (live captions). */
  caption?: string;
  /** Phrases of the current question that couldn't be transcribed (e.g. speech-to-text was busy). */
  captionGaps?: number;
  onBreak?: boolean;
  checkIn?: boolean;
  crisis?: boolean;
  cameraOn?: boolean;
  micOn?: boolean;
  updatedAt?: string;
}

export interface LiveInterview {
  interview_link_id: number;
  patient_name: string;
  since: string | null;
  question_index: number | null;
  question_total: number | null;
}

export const liveApi = {
  /** This therapist's interviews with the patient in the room right now. */
  status() {
    return httpClient.get<{ live: LiveInterview[] }>("/api/live/status");
  },
};
