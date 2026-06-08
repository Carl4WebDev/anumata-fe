import { useState, useCallback, useMemo, useEffect } from "react";
import { SessionsContext } from "./SessionsContext";
import { sessionsApi } from "../../../shared/api/sessionsApi";
import { ApiError } from "../../../shared/api/httpClient";

function mapSession(s: any) {
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
    spikes: (s.emotional_spikes || []).map((sp: any) => ({
      questionIndex: sp.question_index ?? sp.questionIndex ?? 0,
      label: sp.label ?? "Emotional spike",
      emotion: sp.emotion ?? "sad",
      intensity: sp.intensity ?? 0,
    })),
    responses: (s.transcript || []).map((t: any) => ({
      question: typeof t.question === "object" ? t.question?.text ?? JSON.stringify(t.question) : t.question ?? "",
      answer: t.answer || "[Audio response recorded]",
      emotion: (t.combined_emotion ?? "neutral").toLowerCase(),
      emotionPct: Math.round(Math.max(t.fer_confidence ?? 0, t.ser_confidence ?? 0) * 100),
    })),
    emotionalEvents: s.emotional_events || [],
    sessionHighlights: s.session_highlights || null,
    notes: s.notes || "",
  };
}

export const SessionsProvider = ({ children }: { children: React.ReactNode }) => {
  const [sessions, setSessions] = useState<any[]>([]);
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
      return mapSession(res.data);
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

  const value = useMemo(
    () => ({ sessions, loading, error, getSessionById, fetchSessionById, updateNotes }),
    [sessions, loading, error, getSessionById, fetchSessionById, updateNotes],
  );

  return <SessionsContext.Provider value={value}>{children}</SessionsContext.Provider>;
};
