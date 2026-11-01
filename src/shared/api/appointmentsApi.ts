import { httpClient } from "./httpClient";

export type AppointmentStatus = "scheduled" | "completed" | "no_show" | "cancelled";

export interface Appointment {
  appointment_id: number;
  therapist_id: number;
  patient_id: number;
  patient_name: string;
  /** Follow-up recommendation this appointment was booked from, if any. */
  follow_up_id: number | null;
  status: AppointmentStatus;
  start_at: string;
  end_at: string;
  reason: string | null;
  cancel_reason: string | null;
  created_at: string;
  updated_at: string;
  events?: AppointmentEvent[];
}

export interface AppointmentEvent {
  event_id: number;
  appointment_id: number;
  action: "booked" | "rescheduled" | "updated" | "cancelled" | "completed" | "no_show";
  detail: string | null;
  created_at: string;
}

export interface AvailabilityWindow {
  availability_id?: number;
  weekday: number; // 0 = Monday ... 6 = Sunday
  start_time: string;
  end_time: string;
}

export interface UnavailableRange {
  unavailable_id: number;
  start_at: string;
  end_at: string;
  reason: string | null;
}

export interface AppointmentSettings {
  therapist_id: number;
  slot_minutes: number;
}

export interface Schedule {
  settings: AppointmentSettings;
  availability: AvailabilityWindow[];
  unavailable: UnavailableRange[];
}

export interface FreeSlots {
  date: string;
  slot_minutes: number;
  slots: string[];
}

export interface ListFilters {
  status?: AppointmentStatus;
  patient_id?: number;
  from?: string;
  to?: string;
}

export const appointmentsApi = {
  list(filters: ListFilters = {}) {
    const qs = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== "") qs.set(key, String(value));
    }
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return httpClient.get<Appointment[]>(`/api/appointments${suffix}`).then((r) => r.data);
  },

  get(id: number) {
    return httpClient.get<Appointment>(`/api/appointments/${id}`).then((r) => r.data);
  },

  /** Free slots on a Manila calendar date (YYYY-MM-DD); `excludeId` frees the slot of the appointment being moved. */
  freeSlots(date: string, excludeId?: number) {
    const qs = new URLSearchParams({ date });
    if (excludeId) qs.set("exclude", String(excludeId));
    return httpClient.get<FreeSlots>(`/api/appointments/slots?${qs.toString()}`).then((r) => r.data);
  },

  book(body: { patient_id: number; start_at: string; reason?: string; follow_up_id?: number }) {
    return httpClient.post<Appointment>(`/api/appointments`, body).then((r) => r.data);
  },

  update(id: number, body: { start_at?: string; reason?: string | null }) {
    return httpClient.patch<Appointment>(`/api/appointments/${id}`, body).then((r) => r.data);
  },

  cancel(id: number, reason?: string) {
    return httpClient.post<Appointment>(`/api/appointments/${id}/cancel`, { reason }).then((r) => r.data);
  },

  complete(id: number) {
    return httpClient.post<Appointment>(`/api/appointments/${id}/complete`, {}).then((r) => r.data);
  },

  noShow(id: number) {
    return httpClient.post<Appointment>(`/api/appointments/${id}/no-show`, {}).then((r) => r.data);
  },

  getSchedule() {
    return httpClient.get<Schedule>(`/api/appointments/schedule`).then((r) => r.data);
  },

  updateSettings(body: { slot_minutes: number }) {
    return httpClient.put<AppointmentSettings>(`/api/appointments/schedule/settings`, body).then((r) => r.data);
  },

  setAvailability(windows: { weekday: number; start_time: string; end_time: string }[]) {
    return httpClient.put<AvailabilityWindow[]>(`/api/appointments/schedule/availability`, { windows }).then((r) => r.data);
  },

  addUnavailable(body: { start_at: string; end_at: string; reason?: string }) {
    return httpClient.post<UnavailableRange>(`/api/appointments/schedule/unavailable`, body).then((r) => r.data);
  },

  removeUnavailable(id: number) {
    return httpClient.delete<{ removed: boolean }>(`/api/appointments/schedule/unavailable/${id}`).then((r) => r.data);
  },
};
