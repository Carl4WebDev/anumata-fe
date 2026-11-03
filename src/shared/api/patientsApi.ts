import { httpClient } from "./httpClient";
import { runAiJob } from "./aiJobs";
import type { LongitudinalReport } from "../types/session";

export interface Patient {
  patient_id: number;
  therapist_id: number;
  f_name: string;
  m_name: string | null;
  l_name: string;
  age: number;
  gender: string;
  primary_concern: string;
  /** Contacts for appointment reminders (optional). */
  contact_number: string | null;
  email: string | null;
  reminder_consent: boolean;
  profile_image: string | null;
  is_archived: boolean;
  archived_at: string | null;
  session_count: number;
  risk_level: string | null;
  last_interview: string | null;
  longitudinal_report?: LongitudinalReport | null;
  created_at: string;
  updated_at?: string;
}

export const patientsApi = {
  getAll(params?: { search?: string; page?: number; limit?: number }) {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set("search", params.search);
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    const qs = searchParams.toString();
    return httpClient.get<Patient[]>(`/api/patients${qs ? `?${qs}` : ""}`);
  },

  getById(id: number) {
    return httpClient.get<Patient>(`/api/patients/${id}`);
  },

  create(data: {
    f_name: string;
    m_name?: string;
    l_name: string;
    age: number;
    gender: string;
    primary_concern: string;
    contact_number?: string;
    email?: string;
    reminder_consent?: boolean;
  }) {
    return httpClient.post<Patient>("/api/patients", data);
  },

  update(
    id: number,
    data: {
      f_name?: string;
      m_name?: string;
      l_name?: string;
      age?: number;
      gender?: string;
      primary_concern?: string;
      /** "" clears it. */
      contact_number?: string;
      email?: string;
      reminder_consent?: boolean;
      profile_image?: string | null;
      is_archived?: boolean;
    },
  ) {
    return httpClient.patch<Patient>(`/api/patients/${id}`, data);
  },

  remove(id: number) {
    return httpClient.delete<{ deleted: boolean }>(`/api/patients/${id}`);
  },

  generateLongitudinalReport(id: number) {
    return runAiJob<LongitudinalReport>(`/api/patients/${id}/longitudinal-report`);
  },
};
