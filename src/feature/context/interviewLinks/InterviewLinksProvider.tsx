import { useState, useCallback, useMemo, useEffect } from "react";
import { InterviewLinksContext } from "./InterviewLinksContext";
import { interviewLinksApi } from "../../../shared/api/interviewLinksApi";
import { ApiError } from "../../../shared/api/httpClient";
import { INTERVIEW_UPDATE_EVENT } from "../../../shared/hooks/useNotifications";
import { optimistic, patchItems, removeItems } from "../../../shared/utils/optimistic";

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
  // Start as loading: the first fetch begins on mount, so never flash an empty list.
  const [loading, setLoading] = useState(true);
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

  // A patient finished / results landed: refresh so statuses update live.
  useEffect(() => {
    const onUpdate = () => {
      interviewLinksApi.getAll().then(
        (res) => setLinks(res.data.map(mapLink)),
        () => {},
      );
    };
    window.addEventListener(INTERVIEW_UPDATE_EVENT, onUpdate);
    return () => window.removeEventListener(INTERVIEW_UPDATE_EVENT, onUpdate);
  }, []);

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
      // The server returns the names; fall back to the ones just picked.
      const mapped = mapLink({
        ...res.data,
        patient_name: res.data.patient_name ?? data.patientName,
        question_set_name: res.data.question_set_name ?? data.templateName,
      });
      setLinks((prev) => [mapped, ...prev]);
      return { ok: true, data: mapped };
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to generate link";
      setError(message);
      return { ok: false };
    }
  }, []);

  const updateStatus = useCallback(async (id: number, status: string) => {
    // Optimistic: the new status shows at once; undone if the server refuses.
    try {
      await optimistic(setLinks, patchItems((l: { id: number; status: string }) => l.id === id, { status }), () =>
        interviewLinksApi.updateStatus(id, status.toLowerCase()),
      );
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to update status";
      setError(`${message} — the previous status was restored.`);
    }
  }, []);

  const removeLink = useCallback(async (id: number) => {
    try {
      await optimistic(setLinks, removeItems((l: { id: number }) => l.id === id), () => interviewLinksApi.remove(id));
      return true;
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to remove link";
      setError(`${message} — the link was put back.`);
      return false;
    }
  }, []);

  const value = useMemo(
    () => ({ links, loading, error, clearError, generateLink, updateStatus, removeLink }),
    [links, loading, error, clearError, generateLink, updateStatus, removeLink],
  );

  return <InterviewLinksContext.Provider value={value}>{children}</InterviewLinksContext.Provider>;
};
