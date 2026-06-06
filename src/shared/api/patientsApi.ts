import { httpClient } from "./httpClient";

export interface Patient {
  patient_id: number;
  therapist_id: number;
  full_name: string;
  age: number;
  gender: string;
  primary_concern: string;
  session_count: number;
  risk_level: string | null;
  last_interview: string | null;
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

  create(data: { full_name: string; age: number; gender: string; primary_concern: string }) {
    return httpClient.post<Patient>("/api/patients", data);
  },

  update(id: number, data: { full_name?: string; age?: number; gender?: string; primary_concern?: string }) {
    return httpClient.patch<Patient>(`/api/patients/${id}`, data);
  },

  remove(id: number) {
    return httpClient.delete<{ deleted: boolean }>(`/api/patients/${id}`);
  },
};
