import { httpClient } from "./httpClient";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

/** The live-viewing WebSocket on the backend: http(s)://host → ws(s)://host/ws/live. */
export function liveSocketUrl(): string {
  return `${API_BASE.replace(/^http/, "ws").replace(/\/$/, "")}/ws/live`;
}

export interface LiveSupport {
  /** Still on (the patient hasn't chosen yet). */
  active: boolean;
  /** What Amumata said last, in English for the therapist. */
  lastLine?: string;
  /** How many lines Amumata has said, so each new one shows as an event. */
  lineCount?: number;
  choice?: "continued" | "break" | "ended";
}

/** Longest message either side can send (same as the server). */
export const TALK_MAX = 500;
/** How many recent messages each side keeps (same as the server). */
const TALK_KEEP = 50;

/**
 * One thing said or done when the therapist steps in during a live interview:
 * a message (from either side), or the therapist pausing / resuming the questions.
 */
export interface LiveTalkItem {
  ref: string;
  sender: "therapist" | "patient";
  kind: "message" | "pause" | "resume";
  body: string | null;
  at: string;
  /** When the patient's screen showed it (therapist messages). */
  seenAt: string | null;
  /** Resumed by the server because the therapist closed the live view. */
  auto?: boolean;
}

/** The conversation with `item` added (or updated, if already there). */
export function mergeTalk(items: readonly LiveTalkItem[], item: LiveTalkItem): LiveTalkItem[] {
  const known = items.some((t) => t.ref === item.ref);
  const next = known ? items.map((t) => (t.ref === item.ref ? item : t)) : [...items, item];
  return next.slice(-TALK_KEEP);
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
  /** Support mode: questions paused after red-flag words; Amumata keeps the patient company. */
  support?: LiveSupport | null;
  /** The therapist's pause has taken effect on the patient's screen (questions held). */
  heldByTherapist?: boolean;
  /** The patient's language, once Amumata has heard them (for the therapist's quick lines). */
  language?: "en" | "tl" | "ceb";
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
