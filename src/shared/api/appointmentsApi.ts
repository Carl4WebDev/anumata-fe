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
  /** The patient's interview before this appointment (sent after their previous one), if any. */
  interview?: AppointmentInterview | null;
  /** Recurring series this session belongs to, and its position ("3 of 8"). */
  series_id?: string | null;
  series_index?: number | null;
  series_total?: number | null;
  /** Session type it was booked as, and that type's name at booking time. */
  session_type_id?: number | null;
  session_type?: string | null;
}

/** A therapist-defined kind of session with its own length, e.g. "Consultation", 30 min. */
export interface SessionType {
  session_type_id: number;
  name: string;
  duration_minutes: number;
}

/** Result of booking a recurring series. */
export interface BookedSeries {
  appointments: Appointment[];
  /** Dates that weren't free and were skipped (with skip_unavailable). */
  skipped: string[];
}

export interface AppointmentInterview {
  interview_link_id: number;
  token: string;
  status: "pending" | "in_progress" | "completed" | "expired" | string;
  created_at: string;
  /** Set once the interview has been analysed. */
  session_id: number | null;
  risk_level: string | null;
  spike_count: number;
  /** Words of self-harm were heard during the interview. */
  crisis: boolean;
}

export interface AppointmentEvent {
  event_id: number;
  appointment_id: number;
  action: "booked" | "rescheduled" | "updated" | "cancelled" | "completed" | "no_show" | "reopened";
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
  /** Default session length, used when no session type is chosen. */
  slot_minutes: number;
  /** Free time kept after every appointment. */
  break_minutes: number;
}

export interface Schedule {
  settings: AppointmentSettings;
  availability: AvailabilityWindow[];
  unavailable: UnavailableRange[];
  session_types: SessionType[];
}

export interface FreeSlots {
  date: string;
  /** Length of the session these slots are for. */
  slot_minutes: number;
  break_minutes: number;
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

  /**
   * Free slots on a Manila calendar date (YYYY-MM-DD) for a session type's
   * length; `excludeId` frees the slot of the appointment being moved (and
   * uses its length).
   */
  freeSlots(date: string, excludeId?: number, sessionTypeId?: number) {
    const qs = new URLSearchParams({ date });
    if (excludeId) qs.set("exclude", String(excludeId));
    if (sessionTypeId) qs.set("session_type_id", String(sessionTypeId));
    return httpClient.get<FreeSlots>(`/api/appointments/slots?${qs.toString()}`).then((r) => r.data);
  },

  /**
   * One appointment, or with `repeat` a recurring series (→ { appointments, skipped }).
   * `skip_unavailable`: book the free dates of the series and skip the taken ones.
   */
  book(body: {
    patient_id: number;
    start_at: string;
    reason?: string;
    follow_up_id?: number;
    session_type_id?: number;
    repeat?: { every_weeks: 1 | 2; count: number };
    skip_unavailable?: boolean;
  }) {
    return httpClient.post<Appointment | BookedSeries>(`/api/appointments`, body).then((r) => r.data);
  },

  update(id: number, body: { start_at?: string; reason?: string | null }) {
    return httpClient.patch<Appointment>(`/api/appointments/${id}`, body).then((r) => r.data);
  },

  /** scope "following": this session and every later session of its series. */
  cancel(id: number, reason?: string, scope: "one" | "following" = "one") {
    return httpClient.post<Appointment | { cancelled: number }>(`/api/appointments/${id}/cancel`, { reason, scope }).then((r) => r.data);
  },

  complete(id: number) {
    return httpClient.post<Appointment>(`/api/appointments/${id}/complete`, {}).then((r) => r.data);
  },

  noShow(id: number) {
    return httpClient.post<Appointment>(`/api/appointments/${id}/no-show`, {}).then((r) => r.data);
  },

  /** Back to scheduled, within 15 minutes of completed / no-show / cancelled. */
  undo(id: number) {
    return httpClient.post<Appointment>(`/api/appointments/${id}/undo`, {}).then((r) => r.data);
  },

  getSchedule() {
    return httpClient.get<Schedule>(`/api/appointments/schedule`).then((r) => r.data);
  },

  updateSettings(body: { slot_minutes?: number; break_minutes?: number }) {
    return httpClient.put<AppointmentSettings>(`/api/appointments/schedule/settings`, body).then((r) => r.data);
  },

  createSessionType(body: { name: string; duration_minutes: number }) {
    return httpClient.post<SessionType>(`/api/appointments/schedule/session-types`, body).then((r) => r.data);
  },

  /** Changes future bookings only; booked appointments keep their times. */
  updateSessionType(id: number, body: { name?: string; duration_minutes?: number }) {
    return httpClient.put<SessionType>(`/api/appointments/schedule/session-types/${id}`, body).then((r) => r.data);
  },

  /** Hidden, not deleted: past appointments keep its name. */
  removeSessionType(id: number) {
    return httpClient.delete<{ removed: boolean }>(`/api/appointments/schedule/session-types/${id}`).then((r) => r.data);
  },

  /** `confirm`: save even though booked appointments would fall outside the new hours. */
  setAvailability(windows: { weekday: number; start_time: string; end_time: string }[], confirm = false) {
    return httpClient
      .put<AvailabilityWindow[]>(`/api/appointments/schedule/availability`, { windows, confirm })
      .then((r) => r.data);
  },

  /** `confirm`: block the period even though appointments are already booked in it. */
  addUnavailable(body: { start_at: string; end_at: string; reason?: string; confirm?: boolean }) {
    return httpClient.post<UnavailableRange>(`/api/appointments/schedule/unavailable`, body).then((r) => r.data);
  },

  removeUnavailable(id: number) {
    return httpClient.delete<{ removed: boolean }>(`/api/appointments/schedule/unavailable/${id}`).then((r) => r.data);
  },
};
