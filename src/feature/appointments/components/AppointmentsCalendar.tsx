import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { appointmentsApi, type Appointment, type AppointmentStatus } from "../../../shared/api/appointmentsApi";
import { usePatients } from "../../context/patients/usePatients";
import AppointmentCard from "./AppointmentCard";
import { WEEKDAYS, formatDayHeading, formatTime, manilaToday, statusStyles } from "../utils/appointmentUtils";
import {
  SORT_OPTIONS,
  byDay,
  filterAppointments,
  formatMonth,
  monthGrid,
  monthOf,
  monthRange,
  shiftMonth,
  sortAppointments,
  type SortKey,
} from "../utils/calendarUtils";

const ALL_STATUSES: AppointmentStatus[] = ["scheduled", "completed", "no_show", "cancelled"];
const DONE_STATUSES: AppointmentStatus[] = ["completed", "no_show", "cancelled"];
const CHIPS_PER_DAY = 3;

interface PatientOption {
  id: number;
  name: string;
}

interface AppointmentsCalendarProps {
  /** Changes whenever the page reloads, so the calendar refetches too. */
  version: number;
  onEdit: (appt: Appointment) => void;
  onCancel: (appt: Appointment) => void;
  onQuickAction: (fn: () => Promise<unknown>, successMessage: string) => void;
}

interface MonthResult {
  month: string;
  list: Appointment[];
  error?: string;
}

const control = "rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500";

export default function AppointmentsCalendar({ version, onEdit, onCancel, onQuickAction }: AppointmentsCalendarProps) {
  const today = useMemo(() => manilaToday(), []);
  const { patients } = usePatients();
  const patientOptions = useMemo(
    () => (patients as PatientOption[]).map((p) => ({ id: p.id, name: p.name })).sort((a, b) => a.name.localeCompare(b.name)),
    [patients],
  );

  const [month, setMonth] = useState(monthOf(today));
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [patientId, setPatientId] = useState<number | null>(null);
  const [statuses, setStatuses] = useState<AppointmentStatus[]>(ALL_STATUSES);
  const [sortKey, setSortKey] = useState<SortKey>("time");
  const [result, setResult] = useState<MonthResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    appointmentsApi.list(monthRange(month)).then(
      (list) => !cancelled && setResult({ month, list }),
      (err: unknown) =>
        !cancelled && setResult({ month, list: [], error: err instanceof Error ? err.message : "Failed to load the calendar" }),
    );
    return () => {
      cancelled = true;
    };
  }, [month, version]);

  const current = result && result.month === month ? result : null;
  const filtered = useMemo(
    () => filterAppointments(current?.list ?? [], { patientId, statuses }),
    [current, patientId, statuses],
  );
  const days = useMemo(() => byDay(filtered), [filtered]);
  const listed = sortAppointments(selectedDay ? (days.get(selectedDay) ?? []) : filtered, sortKey);

  const goToMonth = (next: string) => {
    setMonth(next);
    setSelectedDay(null);
  };
  const toggleStatus = (s: AppointmentStatus) =>
    setStatuses((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  const sameStatuses = (set: AppointmentStatus[]) => set.length === statuses.length && set.every((s) => statuses.includes(s));

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <label className="text-xs font-medium text-slate-500">
          Patient
          <select
            value={patientId ?? ""}
            onChange={(e) => setPatientId(e.target.value ? Number(e.target.value) : null)}
            className={`${control} mt-1 block min-w-48`}
            aria-label="Filter by patient"
          >
            <option value="">All patients</option>
            {patientOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-slate-500">
          Sort list by
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className={`${control} mt-1 block`}
            aria-label="Sort by"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <div className="text-xs font-medium text-slate-500">
          Status
          <div className="mt-1 flex flex-wrap gap-1.5">
            {ALL_STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => toggleStatus(s)}
                aria-pressed={statuses.includes(s)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                  statuses.includes(s) ? statusStyles[s].className : "border-slate-200 bg-white text-slate-400 line-through"
                }`}
              >
                {statusStyles[s].label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setStatuses(sameStatuses(DONE_STATUSES) ? ALL_STATUSES : DONE_STATUSES)}
              className="rounded-full px-2 py-1.5 text-xs text-teal-600 hover:underline"
            >
              {sameStatuses(DONE_STATUSES) ? "Show all" : "Done only"}
            </button>
          </div>
        </div>
      </div>

      {/* Month grid */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <button onClick={() => goToMonth(shiftMonth(month, -1))} className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50" aria-label="Previous month">
            <ChevronLeft size={16} />
          </button>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-[#08132E]">{formatMonth(month)}</h2>
            {month !== monthOf(today) && (
              <button onClick={() => goToMonth(monthOf(today))} className="text-sm text-teal-600 hover:underline">
                Today
              </button>
            )}
          </div>
          <button onClick={() => goToMonth(shiftMonth(month, 1))} className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50" aria-label="Next month">
            <ChevronRight size={16} />
          </button>
        </div>

        {current?.error && <p className="mb-2 text-sm text-rose-600">{current.error}</p>}

        <div className="overflow-x-auto">
          <div className="grid min-w-[640px] grid-cols-7 gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200">
            {WEEKDAYS.map((d) => (
              <div key={d} className="bg-slate-50 py-1.5 text-center text-xs font-semibold text-slate-500">
                {d}
              </div>
            ))}
            {monthGrid(month).flat().map((day) => {
              const inMonth = monthOf(day) === month;
              const items = days.get(day) ?? [];
              const isSelected = day === selectedDay;
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSelectedDay(isSelected ? null : day)}
                  aria-label={`${formatDayHeading(day)}, ${items.length} appointment${items.length === 1 ? "" : "s"}`}
                  aria-pressed={isSelected}
                  className={`flex min-h-24 flex-col gap-1 p-1.5 text-left align-top transition ${
                    isSelected ? "bg-teal-50 ring-2 ring-inset ring-teal-500" : inMonth ? "bg-white hover:bg-slate-50" : "bg-slate-50/70"
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                      day === today ? "bg-teal-600 font-semibold text-white" : inMonth ? "text-slate-700" : "text-slate-300"
                    }`}
                  >
                    {Number(day.slice(8))}
                  </span>
                  {!current && inMonth ? null : (
                    <>
                      {items.slice(0, CHIPS_PER_DAY).map((a) => (
                        <span
                          key={a.appointment_id}
                          className={`truncate rounded-md border px-1.5 py-0.5 text-[11px] leading-tight ${statusStyles[a.status].className}`}
                          title={`${formatTime(a.start_at)} · ${a.patient_name} · ${statusStyles[a.status].label}`}
                        >
                          {formatTime(a.start_at)} {a.patient_name}
                        </span>
                      ))}
                      {items.length > CHIPS_PER_DAY && (
                        <span className="text-[11px] font-medium text-slate-500">+{items.length - CHIPS_PER_DAY} more</span>
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </div>
        {!current && <p className="mt-2 text-xs text-slate-400">Loading {formatMonth(month)}…</p>}
      </div>

      {/* List for the selected day, or the whole month */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <h2 className="text-lg font-semibold text-[#08132E]">
            {selectedDay ? formatDayHeading(selectedDay) : `All of ${formatMonth(month)}`}
          </h2>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{listed.length}</span>
          {selectedDay && (
            <button onClick={() => setSelectedDay(null)} className="flex items-center gap-1 text-sm text-teal-600 hover:underline">
              <X size={14} /> Show whole month
            </button>
          )}
        </div>
        {listed.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">
            No appointments match these filters.
          </div>
        ) : (
          <div className="space-y-3">
            {listed.map((a) => (
              <AppointmentCard key={a.appointment_id} appt={a} showDate onEdit={onEdit} onCancel={onCancel} onQuickAction={onQuickAction} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
