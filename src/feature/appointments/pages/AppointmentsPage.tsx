import { useCallback, useEffect, useState } from "react";
import { CalendarDays, CalendarRange, AlertTriangle, RefreshCw, Plus, ClipboardCheck, History, List } from "lucide-react";
import { appointmentsApi, type Appointment, type Schedule } from "../../../shared/api/appointmentsApi";
import { AppointmentsSkeleton } from "../../../shared/components/Skeleton";
import { useToast } from "../../../shared/context/ToastContext";
import AppointmentCard from "../components/AppointmentCard";
import AppointmentsCalendar from "../components/AppointmentsCalendar";
import AppointmentFormModal, { type FormMode } from "../components/AppointmentFormModal";
import CancelAppointmentModal from "../components/CancelAppointmentModal";
import ScheduleSettings from "../components/ScheduleSettings";
import { formatDayHeading, groupAppointments, groupByDay, manilaToday } from "../utils/appointmentUtils";

const HISTORY_PAGE = 10;

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

export default function AppointmentsPage() {
  const { success, error: toastError } = useToast();
  const [appointments, setAppointments] = useState<Appointment[] | null>(null);
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [form, setForm] = useState<FormMode | null>(null);
  const [cancelling, setCancelling] = useState<Appointment | null>(null);
  const [historyShown, setHistoryShown] = useState(HISTORY_PAGE);
  const [view, setView] = useState<"list" | "calendar">("list");
  // Bumped on every successful load so the calendar refetches its month too.
  const [version, setVersion] = useState(0);

  const load = useCallback(
    () =>
      Promise.all([appointmentsApi.list(), appointmentsApi.getSchedule()]).then(
        ([list, sched]) => {
          setAppointments(list);
          setSchedule(sched);
          setLoadError(null);
          setVersion((v) => v + 1);
        },
        (err: unknown) => setLoadError(errorMessage(err, "Failed to load appointments")),
      ),
    [],
  );

  useEffect(() => {
    load();
  }, [load]);

  const afterSave = (message: string) => {
    setForm(null);
    setCancelling(null);
    success(message);
    load();
  };

  const runQuickAction = async (fn: () => Promise<unknown>, successMessage: string) => {
    try {
      await fn();
      success(successMessage);
    } catch (err) {
      toastError(errorMessage(err, "Action failed"));
    }
    await load();
  };

  if (loadError) {
    return (
      <div className="p-8">
        <div className="mx-auto max-w-lg rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
          <AlertTriangle className="mx-auto mb-3 text-rose-500" size={32} />
          <p className="mb-4 text-rose-700">{loadError}</p>
          <button onClick={load} className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!appointments || !schedule) {
    return <AppointmentsSkeleton />;
  }

  const { needsOutcome, upcoming, history } = groupAppointments(appointments);
  const today = manilaToday();
  const cardProps = { onEdit: (appt: Appointment) => setForm({ kind: "edit", appt }), onCancel: setCancelling, onQuickAction: runQuickAction };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#08132E]">Appointments</h1>
          <p className="text-sm text-slate-500">Set your schedule and book patients into your free times.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
            <RefreshCw size={16} /> Refresh
          </button>
          <button
            onClick={() => setForm({ kind: "book" })}
            disabled={schedule.availability.length === 0}
            title={schedule.availability.length === 0 ? "Set your working hours first" : undefined}
            className="flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
          >
            <Plus size={16} /> Book appointment
          </button>
        </div>
      </div>

      <ScheduleSettings schedule={schedule} onChanged={load} />

      <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1" role="tablist" aria-label="Appointments view">
        {([
          ["list", "List", List],
          ["calendar", "Calendar", CalendarRange],
        ] as const).map(([key, label, Icon]) => (
          <button
            key={key}
            role="tab"
            aria-selected={view === key}
            onClick={() => setView(key)}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm ${
              view === key ? "bg-teal-600 font-medium text-white" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {view === "calendar" ? (
        <AppointmentsCalendar version={version} {...cardProps} />
      ) : (
      <>
      {needsOutcome.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-[#08132E]">
            <ClipboardCheck size={18} className="text-amber-500" /> Record outcome
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">{needsOutcome.length}</span>
          </h2>
          <p className="mb-3 text-sm text-slate-500">These appointments have started — mark them completed or no-show.</p>
          <div className="space-y-3">
            {needsOutcome.map((a) => (
              <AppointmentCard key={a.appointment_id} appt={a} showDate {...cardProps} />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-[#08132E]">
          <CalendarDays size={18} className="text-teal-600" /> Upcoming
          <span className="rounded-full bg-teal-100 px-2 py-0.5 text-xs text-teal-700">{upcoming.length}</span>
        </h2>
        {upcoming.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">
            No upcoming appointments.
          </div>
        ) : (
          <div className="space-y-5">
            {groupByDay(upcoming).map((day) => (
              <div key={day.date}>
                <h3 className="mb-2 text-sm font-semibold text-slate-600">
                  {day.date === today ? "Today · " : ""}
                  {formatDayHeading(day.date)}
                </h3>
                <div className="space-y-3">
                  {day.items.map((a) => (
                    <AppointmentCard key={a.appointment_id} appt={a} {...cardProps} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {history.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-[#08132E]">
            <History size={18} className="text-slate-400" /> History
          </h2>
          <div className="space-y-3 opacity-80">
            {history.slice(0, historyShown).map((a) => (
              <AppointmentCard key={a.appointment_id} appt={a} showDate {...cardProps} />
            ))}
          </div>
          {history.length > historyShown && (
            <button
              onClick={() => setHistoryShown((n) => n + HISTORY_PAGE)}
              className="mt-3 text-sm text-teal-600 hover:underline"
            >
              Show more ({history.length - historyShown} older)
            </button>
          )}
        </section>
      )}
      </>
      )}

      {form && <AppointmentFormModal mode={form} onClose={() => setForm(null)} onSaved={afterSave} />}
      {cancelling && <CancelAppointmentModal appt={cancelling} onClose={() => setCancelling(null)} onSaved={afterSave} />}
    </div>
  );
}
