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
import { SessionsContext } from "./SessionsContext";
import { sessionsApi } from "../../../shared/api/sessionsApi";
import { ApiError } from "../../../shared/api/httpClient";
import type { Session, MappedSession } from "../../../shared/types/session";

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
function mapSession(s: Session): MappedSession {
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
    emotions: {
      sad: dist.Sad ?? dist.sad ?? 0,
      happy: dist.Happy ?? dist.happy ?? 0,
      angry: dist.Angry ?? dist.angry ?? 0,
      neutral: dist.Neutral ?? dist.neutral ?? 0,
    },
    spikes: (s.emotional_spikes || []).map((sp) => ({
      questionIndex: sp.question_index ?? 0,
      label: sp.label ?? "Emotional spike",
      emotion: sp.emotion ?? "sad",
      intensity: sp.intensity ?? 0,
    })),
    responses: (s.transcript || []).map((t) => ({
      question: typeof t.question === "object" ? t.question?.text ?? JSON.stringify(t.question) : t.question ?? "",
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
      frame_image: t.frame_image ?? null,
      evidence_frames: t.evidence_frames ?? null,
    })),
    emotionalEvents: s.emotional_events || [],
    sessionHighlights: s.session_highlights || null,
    report: s.report ?? null,
    notes: s.notes || "",
  };
}

export const SessionsProvider = ({ children }: { children: React.ReactNode }) => {
  const [sessions, setSessions] = useState<MappedSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await sessionsApi.getAll();
      setSessions(res.data.map(mapSession));
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
      await sessionsApi.updateNotes(sessionId, notes);
      setSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? { ...s, notes } : s))
      );
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to update notes";
      setError(message);
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
