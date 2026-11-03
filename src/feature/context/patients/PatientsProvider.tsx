import { useState, useCallback, useMemo, useEffect } from "react";
import { PatientsContext, type AddPatientInput } from "./PatientsContext";
import { patientsApi } from "../../../shared/api/patientsApi";
import { followUpsApi } from "../../../shared/api/followUpsApi";
import { ApiError } from "../../../shared/api/httpClient";
import { formatName } from "../../../shared/utils/formatName";
import type { FollowUp } from "../../../shared/api/followUpsApi";
import { optimistic, patchItems, removeItems } from "../../../shared/utils/optimistic";

function mapPatient(p: any, followUps: FollowUp[]) {
  const patientFollowUps = followUps.filter(
    (f) => f.patient_id === p.patient_id && (f.status === "recommended" || f.status === "scheduled")
  );
  const nextFollowUp = patientFollowUps
    .sort((a, b) => a.recommended_date.localeCompare(b.recommended_date))[0] || null;

  return {
    id: p.patient_id,
    name: formatName(p.f_name, p.m_name, p.l_name),
    age: p.age,
    gender: p.gender.charAt(0).toUpperCase() + p.gender.slice(1),
    concern: p.primary_concern,
    contactNumber: p.contact_number ?? null,
    email: p.email ?? null,
    reminderConsent: Boolean(p.reminder_consent),
    profileImage: p.profile_image ?? null,
    isArchived: Boolean(p.is_archived),
    status: p.is_archived ? "Archived" : "Active",
    risk: p.risk_level ? p.risk_level.charAt(0).toUpperCase() + p.risk_level.slice(1) : "N/A",
    sessions: p.session_count ?? 0,
    lastInterview: p.last_interview
      ? new Date(p.last_interview).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      : "N/A",
    nextFollowUpDate: nextFollowUp?.recommended_date || null,
    nextFollowUpStatus: nextFollowUp?.status || null,
  };
}

export const PatientsProvider = ({ children }: { children: React.ReactNode }) => {
  const [patients, setPatients] = useState<any[]>([]);
  // Start as loading: the first fetch begins on mount, so never flash an empty list.
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPatients = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [patientsRes, followUpsRes] = await Promise.all([
        patientsApi.getAll(),
        followUpsApi.getAll().catch(() => ({ data: [] })),
      ]);
      const followUps = followUpsRes.data || [];
      setPatients(patientsRes.data.map((p: any) => mapPatient(p, followUps)));
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to load patients";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  const clearError = useCallback(() => setError(null), []);

  const addPatient = useCallback(async (data: AddPatientInput) => {
    try {
      const res = await patientsApi.create({
        f_name: data.f_name,
        m_name: data.m_name,
        l_name: data.l_name,
        age: data.age,
        gender: data.gender.toLowerCase(),
        primary_concern: data.concern,
        contact_number: data.contact_number || undefined,
        email: data.email || undefined,
        reminder_consent: Boolean(data.reminder_consent && data.email),
      });
      const mapped = mapPatient(res.data, []);
      setPatients((prev) => [mapped, ...prev]);
      return { ok: true, data: mapped };
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to add patient";
      setError(message);
      return { ok: false, error: message };
    }
  }, []);

  const removePatient = useCallback(async (id: number) => {
    try {
      await optimistic(setPatients, removeItems((p: { id: number }) => p.id === id), () => patientsApi.remove(id));
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to remove patient";
      setError(`${message} — the patient was put back.`);
    }
  }, []);

  // Editable fields mapped from a raw API patient onto the display shape.
  const detailPatch = (p: any) => ({
    name: formatName(p.f_name, p.m_name, p.l_name),
    age: p.age,
    gender: p.gender.charAt(0).toUpperCase() + p.gender.slice(1),
    concern: p.primary_concern,
    contactNumber: p.contact_number ?? null,
    email: p.email ?? null,
    reminderConsent: Boolean(p.reminder_consent),
    profileImage: p.profile_image ?? null,
    isArchived: Boolean(p.is_archived),
    status: p.is_archived ? "Archived" : "Active",
  });

  const updatePatient = useCallback(async (id: number, data: Parameters<typeof patientsApi.update>[1]) => {
    try {
      const res = await patientsApi.update(id, data);
      setPatients((prev) => prev.map((p) => (p.id === id ? { ...p, ...detailPatch(res.data) } : p)));
      return { ok: true, data: res.data };
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to update patient";
      setError(message);
      return { ok: false, error: message };
    }
  }, []);

  // Optimistic: the patient moves to/from the archive at once.
  const setArchived = useCallback(async (id: number, isArchived: boolean) => {
    const status = isArchived ? "Archived" : "Active";
    try {
      let saved: unknown;
      await optimistic(setPatients, patchItems((p: { id: number; isArchived: boolean; status: string }) => p.id === id, { isArchived, status }), async () => {
        saved = (await patientsApi.update(id, { is_archived: isArchived })).data;
      });
      return { ok: true, data: saved };
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to update patient";
      return { ok: false, error: `${message} — no change was made.` };
    }
  }, []);

  const setProfileImage = useCallback(async (id: number, profileImage: string | null) => {
    return updatePatient(id, { profile_image: profileImage });
  }, [updatePatient]);

  const value = useMemo(
    () => ({ patients, loading, error, clearError, addPatient, removePatient, updatePatient, setArchived, setProfileImage }),
    [patients, loading, error, clearError, addPatient, removePatient, updatePatient, setArchived, setProfileImage],
  );

  return <PatientsContext.Provider value={value}>{children}</PatientsContext.Provider>;
};