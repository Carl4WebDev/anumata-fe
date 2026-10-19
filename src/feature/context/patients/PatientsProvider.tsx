import { useState, useCallback, useMemo, useEffect } from "react";
import { PatientsContext } from "./PatientsContext";
import { patientsApi } from "../../../shared/api/patientsApi";
import { ApiError } from "../../../shared/api/httpClient";
import { formatName } from "../../../shared/utils/formatName";

function mapPatient(p: any) {
  return {
    id: p.patient_id,
    name: formatName(p.f_name, p.m_name, p.l_name),
    age: p.age,
    gender: p.gender.charAt(0).toUpperCase() + p.gender.slice(1),
    concern: p.primary_concern,
    status: "Active",
    risk: p.risk_level ? p.risk_level.charAt(0).toUpperCase() + p.risk_level.slice(1) : "N/A",
    sessions: p.session_count ?? 0,
    lastInterview: p.last_interview
      ? new Date(p.last_interview).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      : "N/A",
  };
}

export const PatientsProvider = ({ children }: { children: React.ReactNode }) => {
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPatients = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await patientsApi.getAll();
      setPatients(res.data.map(mapPatient));
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

  const addPatient = useCallback(async (data: { f_name: string; m_name?: string; l_name: string; age: number; gender: string; concern: string }) => {
    try {
      const res = await patientsApi.create({
        f_name: data.f_name,
        m_name: data.m_name,
        l_name: data.l_name,
        age: data.age,
        gender: data.gender.toLowerCase(),
        primary_concern: data.concern,
      });
      const mapped = mapPatient(res.data);
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
      await patientsApi.remove(id);
      setPatients((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to remove patient";
      setError(message);
    }
  }, []);

  const value = useMemo(
    () => ({ patients, loading, error, clearError, addPatient, removePatient }),
    [patients, loading, error, clearError, addPatient, removePatient],
  );

  return <PatientsContext.Provider value={value}>{children}</PatientsContext.Provider>;
};
