import { useState, useCallback, useMemo, useEffect } from "react";
import { InterviewLinksContext } from "./InterviewLinksContext";
import { interviewLinksApi } from "../../../shared/api/interviewLinksApi";
import { ApiError } from "../../../shared/api/httpClient";

function mapLink(l: any) {
  return {
    id: l.interview_link_id,
    patientId: l.patient_id,
    patientName: l.patient_name,
    templateName: l.question_set_name,
    status: l.status.charAt(0).toUpperCase() + l.status.slice(1),
    createdAt: new Date(l.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    token: l.token,
  };
}

export const InterviewLinksProvider = ({ children }: { children: React.ReactNode }) => {
  const [links, setLinks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLinks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await interviewLinksApi.getAll();
      setLinks(res.data.map(mapLink));
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to load interview links";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  const clearError = useCallback(() => setError(null), []);

const generateLink = useCallback(async (data: {
  patientId: number;
  patientName: string;
  questionSetId: number;
  templateName: string;
}) => {
    try {
const res = await interviewLinksApi.create({
  patient_id: data.patientId,
  question_set_id: data.questionSetId,
});
      const mapped = mapLink(res.data);
      setLinks((prev) => [mapped, ...prev]);
      return { ok: true, data: mapped };
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to generate link";
      setError(message);
      return { ok: false };
    }
  }, []);

  const updateStatus = useCallback(async (id: number, status: string) => {
    try {
      await interviewLinksApi.updateStatus(id, status.toLowerCase());
      setLinks((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to update status";
      setError(message);
    }
  }, []);

  const removeLink = useCallback(async (id: number) => {
    try {
      await interviewLinksApi.remove(id);
      setLinks((prev) => prev.filter((l) => l.id !== id));
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to remove link";
      setError(message);
    }
  }, []);

  const value = useMemo(
    () => ({ links, loading, error, clearError, generateLink, updateStatus, removeLink }),
    [links, loading, error, clearError, generateLink, updateStatus, removeLink],
  );

  return <InterviewLinksContext.Provider value={value}>{children}</InterviewLinksContext.Provider>;
};
