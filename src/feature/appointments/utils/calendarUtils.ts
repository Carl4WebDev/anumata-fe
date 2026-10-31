import type { Appointment, AppointmentStatus } from "../../../shared/api/appointmentsApi";
import { manilaDateOf } from "./appointmentUtils";

/** "YYYY-MM" of a Manila calendar date ("YYYY-MM-DD"). */
export function monthOf(date: string): string {
  return date.slice(0, 7);
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

/** "2026-11" → "November 2026" */
export function formatMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-US", { timeZone: "UTC", month: "long", year: "numeric" });
}

/** Instants bounding a Manila calendar month, for the list API's from/to. */
export function monthRange(month: string): { from: string; to: string } {
  const next = shiftMonth(month, 1);
  return {
    from: new Date(`${month}-01T00:00:00+08:00`).toISOString(),
    to: new Date(`${next}-01T00:00:00+08:00`).toISOString(),
  };
}

/**
 * Weeks (Monday first) covering the month; days outside it are included so
 * every row is full. Each day is "YYYY-MM-DD".
 */
export function monthGrid(month: string): string[][] {
  const [y, m] = month.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const lead = (first.getUTCDay() + 6) % 7; // ISO weekday of the 1st, Monday = 0
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const cells = Math.ceil((lead + daysInMonth) / 7) * 7;

  const weeks: string[][] = [];
  for (let i = 0; i < cells; i++) {
    const day = new Date(Date.UTC(y, m - 1, 1 - lead + i)).toISOString().slice(0, 10);
    if (i % 7 === 0) weeks.push([]);
    weeks[weeks.length - 1].push(day);
  }
  return weeks;
}

export type SortKey = "time" | "patient" | "status";

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "time", label: "Date & time" },
  { value: "patient", label: "Patient name" },
  { value: "status", label: "Status" },
];

const STATUS_ORDER: AppointmentStatus[] = ["scheduled", "completed", "no_show", "cancelled"];

export interface CalendarFilters {
  /** Patient to show, or null for everyone. */
  patientId: number | null;
  statuses: AppointmentStatus[];
}

export function filterAppointments(list: Appointment[], { patientId, statuses }: CalendarFilters): Appointment[] {
  return list.filter((a) => (patientId === null || a.patient_id === patientId) && statuses.includes(a.status));
}

/** Sorted copy; ties fall back to start time so the order is stable. */
export function sortAppointments(list: Appointment[], key: SortKey): Appointment[] {
  const byTime = (a: Appointment, b: Appointment) => Date.parse(a.start_at) - Date.parse(b.start_at);
  const compare: Record<SortKey, (a: Appointment, b: Appointment) => number> = {
    time: byTime,
    patient: (a, b) => a.patient_name.localeCompare(b.patient_name) || byTime(a, b),
    status: (a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) || byTime(a, b),
  };
  return [...list].sort(compare[key]);
}

/** Appointments keyed by their Manila calendar day, in start-time order. */
export function byDay(list: Appointment[]): Map<string, Appointment[]> {
  const map = new Map<string, Appointment[]>();
  for (const appt of sortAppointments(list, "time")) {
    const day = manilaDateOf(appt.start_at);
    map.set(day, [...(map.get(day) ?? []), appt]);
  }
  return map;
}
