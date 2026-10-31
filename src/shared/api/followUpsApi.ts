import { httpClient } from "./httpClient";

export interface FollowUp {
  follow_up_id: number;
  patient_id: number;
  therapist_id: number;
  session_id: number | null;
  recommended_date: string;
  appointment_time: string | null;
  reason: string | null;
  status: "recommended" | "scheduled" | "completed" | "cancelled" | "missed";
  /** Scheduled appointment booked from this follow-up; it then drives status/date/time. */
  appointment_id: number | null;
  appointment_start_at: string | null;
  patient_name?: string;
  created_at: string;
  updated_at: string;
}

export interface FollowUpCounts {
  upcoming: number;
  due_today: number;
  overdue: number;
  completed: number;
  cancelled_or_missed: number;
}

export const followUpsApi = {
  getAll(params?: { status?: string; page?: number; limit?: number }) {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.set("status", params.status);
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    const qs = searchParams.toString();
    return httpClient.get<FollowUp[]>(`/api/follow-ups${qs ? `?${qs}` : ""}`);
  },

  getById(id: number) {
    return httpClient.get<FollowUp>(`/api/follow-ups/${id}`);
  },

  getByPatientId(patientId: number) {
    return httpClient.get<FollowUp[]>(`/api/follow-ups/patient/${patientId}`);
  },

  getUpcoming(limit?: number) {
    const qs = limit ? `?limit=${limit}` : "";
    return httpClient.get<FollowUp[]>(`/api/follow-ups/upcoming${qs}`);
  },

  getDueToday() {
    return httpClient.get<FollowUp[]>(`/api/follow-ups/due-today`);
  },

  getCounts() {
    return httpClient.get<FollowUpCounts>(`/api/follow-ups/counts`);
  },

  create(patientId: number, data: {
    recommended_date: string;
    appointment_time?: string;
    reason?: string;
    session_id?: number;
  }) {
    return httpClient.post<FollowUp>(`/api/follow-ups/patient/${patientId}`, data);
  },

  update(id: number, data: {
    status?: string;
    recommended_date?: string;
    appointment_time?: string;
    reason?: string;
  }) {
    return httpClient.patch<FollowUp>(`/api/follow-ups/${id}`, data);
  },

  remove(id: number) {
    return httpClient.delete<{ deleted: boolean }>(`/api/follow-ups/${id}`);
  },
};