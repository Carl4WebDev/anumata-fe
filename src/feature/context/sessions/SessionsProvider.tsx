/**
 * SESSIONS PROVIDER
 *
 * Purpose:
 * Fetches session data from the backend and converts it from the raw
 * database/API format (Session, snake_case) into the frontend-friendly
 * format (MappedSession, camelCase).
 *
 * Data flow:
 * Backend API → sessionsApi → THIS PROVIDER → mapSession() → MappedSession → SessionReviewPage
 *
 * The mapSession() function is the CRITICAL transformation point.
 * It is where snake_case fields from PostgreSQL become camelCase fields
 * used by React components.
 *
 * Key transformation: emotionPct
 *   Backend stores: fusion_confidence (0.0–1.0)
 *   Frontend uses: emotionPct (0–100, integer)
 *   Computed as: fusion_confidence × 100
 *
 * Related:
 * - Backend: SessionRepo.findById() → sessions table
 * - API: GET /api/sessions/:id
 * - Type: shared/types/session.ts → Session, MappedSession
 * - Consumer: sessionReview/pages/SessionReviewPage.tsx
 */
import { useState, useCallback, useMemo, useEffect } from "react";
import { INTERVIEW_UPDATE_EVENT } from "../../../shared/hooks/useNotifications";
import { SessionsContext } from "./SessionsContext";
import { sessionsApi, type SessionData } from "../../../shared/api/sessionsApi";
import { ApiError } from "../../../shared/api/httpClient";
import type { MappedSession } from "../../../shared/types/session";
import { optimistic, patchItems } from "../../../shared/utils/optimistic";

/**
 * CRITICAL TRANSFORMATION: Session → MappedSession
 *
 * Converts raw backend session data (snake_case, database format)
 * into frontend-friendly format (camelCase).
 *
 * INPUT: Session (from GET /api/sessions/:id)
 *   - snake_case fields: session_id, patient_id, risk_level, emotional_spikes, etc.
 *   - transcript: array of per-question results with fer_emotion, ser_emotion, etc.
 *
 * OUTPUT: MappedSession (used by SessionReviewPage)
 *   - camelCase fields: id, patientId, riskLevel, emotionalEvents, etc.
 *   - responses: array with emotion, emotionPct, fer_emotion, ser_emotion, etc.
 *
 * IMPORTANT FIELD MAPPINGS:
 *   session_id → id
 *   patient_id → patientId
 *   risk_level → riskLevel
 *   combined_emotion → emotion (in responses)
 *   fusion_confidence → emotionPct (× 100)
 *   emotional_events → emotionalEvents
 *   session_highlights → sessionHighlights
 */
/** Older sessions may store a question as { text }; current ones store the text itself. */
function questionText(question: unknown): string {
  if (question && typeof question === "object") {
    return (question as { text?: string }).text ?? JSON.stringify(question);
  }
  return typeof question === "string" ? question : "";
}

function mapSession(s: SessionData): MappedSession {
  const dist = s.emotion_summary?.distribution ?? {};
  return {
    id: s.session_id,
    patientId: s.patient_id,
    patientName: s.patient_name || "",
    templateName: s.template_name || "",
    date: new Date(s.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    duration: s.duration || "N/A",
    riskLevel: s.risk_level ? s.risk_level.charAt(0).toUpperCase() + s.risk_level.slice(1) : "N/A",
    indicators: s.emotion_summary?.indicators ?? [],
    selfReport: s.emotion_summary?.self_report ?? null,
    emotions: {
      sad: dist.Sad ?? dist.sad ?? 0,
      happy: dist.Happy ?? dist.happy ?? 0,
      angry: dist.Angry ?? dist.angry ?? 0,
      neutral: dist.Neutral ?? dist.neutral ?? 0,
    },
    spikes: (s.emotional_spikes || []).map((sp) => ({
      questionIndex: sp.question_index ?? sp.questionIndex ?? 0,
      label: sp.label ?? "Emotional spike",
      emotion: sp.emotion ?? "sad",
      intensity: sp.intensity ?? 0,
      type: sp.type,
    })),
    responses: (s.transcript || []).map((t) => ({
      question: questionText(t.question),
      answer: t.answer || "[Audio response recorded]",
      emotion: (t.combined_emotion ?? "neutral").toLowerCase(),
      emotionPct: Math.round((t.fusion_confidence ?? Math.max(t.fer_confidence ?? 0, t.ser_confidence ?? 0, t.ler_confidence ?? 0)) * 100),
      fer_confidence: t.fer_confidence ?? 0,
      fer_emotion: t.fer_emotion ?? null,
      fer_probabilities: t.fer_probabilities ?? null,
      ser_confidence: t.ser_confidence ?? 0,
      ser_emotion: t.ser_emotion ?? null,
      ser_probabilities: t.ser_probabilities ?? null,
      ler_confidence: t.ler_confidence ?? 0,
      ler_emotion: t.ler_emotion ?? null,
      ler_probabilities: t.ler_probabilities ?? null,
      language_detected: t.language_detected ?? null,
      facial_details: t.facial_details ?? null,
      audio_details: t.audio_details ?? null,
      text_analysis: t.text_analysis ?? null,
      fusion_confidence: t.fusion_confidence ?? null,
      fusion_agreement: t.fusion_agreement ?? null,
      audio_duration: t.audio_duration ?? null,
      rms_level: t.rms_level ?? null,
      is_silence: t.is_silence ?? null,
      face_frames: t.face_frames ?? null,
      follow_up_asked: t.follow_up_asked ?? null,
      feelings_tapped: Array.isArray(t.feelings_tapped) ? t.feelings_tapped : [],
      frame_image: t.frame_image ?? null,
      evidence_frames: t.evidence_frames ?? null,
    })),
    // Same data; the UI's types name the exact emotions the backend sends.
    emotionalEvents: (s.emotional_events || []) as MappedSession["emotionalEvents"],
    sessionHighlights: (s.session_highlights || null) as MappedSession["sessionHighlights"],
    report: s.report ?? null,
    notes: s.notes || "",
  };
}

/** All of the therapist's sessions, mapped for the UI. */
async function loadAllSessions(): Promise<MappedSession[]> {
  const res = await sessionsApi.getAll();
  return res.data.map(mapSession);
}

export const SessionsProvider = ({ children }: { children: React.ReactNode }) => {
  const [sessions, setSessions] = useState<MappedSession[]>([]);
  // Start as loading: the first fetch begins on mount, so never flash an empty list.
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSessions(await loadAllSessions());
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to load sessions";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // New interview results arrived (see NotificationBell): quietly refresh.
  useEffect(() => {
    const onUpdate = () => {
      loadAllSessions().then(setSessions, () => {});
    };
    window.addEventListener(INTERVIEW_UPDATE_EVENT, onUpdate);
    return () => window.removeEventListener(INTERVIEW_UPDATE_EVENT, onUpdate);
  }, []);

  const getSessionById = useCallback((id: number) => {
    return sessions.find((s) => s.id === id) ?? null;
  }, [sessions]);

  const fetchSessionById = useCallback(async (id: number) => {
    try {
      const res = await sessionsApi.getById(id);
      const mapped = mapSession(res.data);
      // Update the list cache so navigating back doesn't lose report data
      setSessions((prev) => prev.map((s) => (s.id === id ? mapped : s)));
      return mapped;
    } catch {
      return null;
    }
  }, []);

  const updateNotes = useCallback(async (sessionId: number, notes: string) => {
    try {
      await optimistic(setSessions, patchItems((s: MappedSession) => s.id === sessionId, { notes }), () =>
        sessionsApi.updateNotes(sessionId, notes),
      );
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to update notes";
      setError(`${message} — your last saved notes were restored.`);
    }
  }, []);

  const regenerateReport = useCallback(async (sessionId: number) => {
    const res = await sessionsApi.regenerateReport(sessionId);
    const newReport = res.data;
    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, report: newReport } : s))
    );
    return newReport;
  }, []);

  const value = useMemo(
    () => ({ sessions, loading, error, getSessionById, fetchSessionById, updateNotes, regenerateReport }),
    [sessions, loading, error, getSessionById, fetchSessionById, updateNotes, regenerateReport],
  );

  return <SessionsContext.Provider value={value}>{children}</SessionsContext.Provider>;
};
