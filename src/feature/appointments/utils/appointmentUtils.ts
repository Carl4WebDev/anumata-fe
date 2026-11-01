import type { Appointment, AppointmentStatus } from "../../../shared/api/appointmentsApi";

// Schedules and slots are defined in the clinic's zone; always display and
// enter times there so what the therapist sees matches the schedule.
export const TIME_ZONE = "Asia/Manila";
const MANILA_OFFSET = "+08:00";

// Backend stores ISO weekdays: 0 = Monday ... 6 = Sunday.
export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const statusStyles: Record<AppointmentStatus, { label: string; className: string }> = {
  scheduled: { label: "Scheduled", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  completed: { label: "Completed", className: "bg-slate-100 text-slate-600 border-slate-200" },
  no_show: { label: "No-show", className: "bg-rose-50 text-rose-700 border-rose-200" },
  cancelled: { label: "Cancelled", className: "bg-slate-100 text-slate-500 border-slate-200" },
};

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    timeZone: TIME_ZONE,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { timeZone: TIME_ZONE, hour: "numeric", minute: "2-digit" });
}

/** "YYYY-MM-DD" → "Monday, November 2" */
export function formatDayHeading(date: string): string {
  return new Date(`${date}T12:00:00${MANILA_OFFSET}`).toLocaleDateString("en-US", {
    timeZone: TIME_ZONE,
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

/** Manila calendar date of an instant, as YYYY-MM-DD. */
export function manilaDateOf(iso: string | Date): string {
  const ms = new Date(iso).getTime() + 8 * 60 * 60 * 1000;
  return new Date(ms).toISOString().slice(0, 10);
}

export function manilaToday(now: Date = new Date()): string {
  return manilaDateOf(now);
}

/** Value of a <input type="datetime-local"> read as Manila time → ISO instant. */
export function manilaInputToIso(value: string): string {
  return new Date(`${value}:00${MANILA_OFFSET}`).toISOString();
}

/** Completed / no-show can only be recorded once the appointment has started. */
export function hasStarted(appt: Pick<Appointment, "start_at">, now: Date = new Date()): boolean {
  return new Date(appt.start_at).getTime() <= now.getTime();
}

export interface AppointmentGroups {
  /** Scheduled but already started — waiting for completed / no-show. */
  needsOutcome: Appointment[];
  upcoming: Appointment[];
  history: Appointment[];
}

export function groupAppointments(appointments: Appointment[], now: Date = new Date()): AppointmentGroups {
  const byStart = (a: Appointment, b: Appointment) => +new Date(a.start_at) - +new Date(b.start_at);
  const scheduled = appointments.filter((a) => a.status === "scheduled");
  return {
    needsOutcome: scheduled.filter((a) => hasStarted(a, now)).sort(byStart),
    upcoming: scheduled.filter((a) => !hasStarted(a, now)).sort(byStart),
    history: appointments.filter((a) => a.status !== "scheduled").sort((a, b) => byStart(b, a)),
  };
}

/** Consecutive appointments grouped under their Manila calendar day (input order kept). */
export function groupByDay(appointments: Appointment[]): { date: string; items: Appointment[] }[] {
  const groups: { date: string; items: Appointment[] }[] = [];
  for (const appt of appointments) {
    const date = manilaDateOf(appt.start_at);
    const last = groups[groups.length - 1];
    if (last && last.date === date) last.items.push(appt);
    else groups.push({ date, items: [appt] });
  }
  return groups;
}
