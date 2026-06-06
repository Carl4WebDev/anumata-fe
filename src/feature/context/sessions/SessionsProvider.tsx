import { useState, useCallback, useMemo, useEffect } from "react";
import { SessionsContext } from "./SessionsContext";
import { sessionsApi } from "../../../shared/api/sessionsApi";
import { ApiError } from "../../../shared/api/httpClient";

function mapSession(s: any) {
  return {
    id: s.session_id,
    patientId: s.patient_id,
    patientName: s.patient_name || "",
    templateName: s.template_name || "",
    date: new Date(s.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    duration: "—",
    riskLevel: s.risk_level ? s.risk_level.charAt(0).toUpperCase() + s.risk_level.slice(1) : "N/A",
    indicators: [],
    emotions: {
      sad: s.emotion_summary?.sad ?? 0,
      happy: s.emotion_summary?.happy ?? 0,
      angry: s.emotion_summary?.angry ?? 0,
      neutral: s.emotion_summary?.neutral ?? 0,
    },
    spikes: (s.emotional_spikes || []).map((sp: any) => ({
      questionIndex: sp.questionIndex ?? 0,
      label: sp.label ?? "Emotional spike",
      emotion: sp.emotion ?? "sad",
      intensity: sp.intensity ?? 0,
    })),
    responses: (s.transcript || []).map((t: any) => ({
      question: t.question,
      answer: t.answer,
      emotion: "neutral",
      emotionPct: 0,
    })),
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
    () => ({ sessions, loading, error, getSessionById, updateNotes }),
    [sessions, loading, error, getSessionById, updateNotes],
  );

  return <SessionsContext.Provider value={value}>{children}</SessionsContext.Provider>;
};
