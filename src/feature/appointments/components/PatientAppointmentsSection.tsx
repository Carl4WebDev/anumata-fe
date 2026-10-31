import { useCallback, useEffect, useState } from "react";
import { CalendarDays, Plus, ChevronDown, ChevronUp } from "lucide-react";
import { appointmentsApi, type Appointment } from "../../../shared/api/appointmentsApi";
import { useToast } from "../../../shared/context/ToastContext";
import AppointmentCard from "./AppointmentCard";
import AppointmentFormModal, { type FormMode } from "./AppointmentFormModal";
import CancelAppointmentModal from "./CancelAppointmentModal";
import { groupAppointments } from "../utils/appointmentUtils";

const PAST_SHOWN = 3;

interface PatientAppointmentsSectionProps {
  patientId: number;
  /** Bumped by the page whenever appointments or follow-ups change elsewhere. */
  refreshKey: number;
  /** Tell the page something changed (follow-ups may have moved too). */
  onChanged: () => void;
}

export default function PatientAppointmentsSection({ patientId, refreshKey, onChanged }: PatientAppointmentsSectionProps) {
  const { success, error: toastError } = useToast();
  const [appointments, setAppointments] = useState<Appointment[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [showAllPast, setShowAllPast] = useState(false);
  const [form, setForm] = useState<FormMode | null>(null);
  const [cancelling, setCancelling] = useState<Appointment | null>(null);

  const load = useCallback(
    () =>
      appointmentsApi.list({ patient_id: patientId }).then(
        (list) => {
          setAppointments(list);
          setLoadError(null);
        },
        (err: unknown) => setLoadError(err instanceof Error ? err.message : "Failed to load appointments"),
      ),
    [patientId],
  );

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const afterSave = (message: string) => {
    setForm(null);
    setCancelling(null);
    success(message);
    onChanged();
  };

  const runQuickAction = async (fn: () => Promise<unknown>, message: string) => {
    try {
      await fn();
      success(message);
    } catch (err) {
      toastError(err instanceof Error ? err.message : "Action failed");
    }
    onChanged();
  };

  const groups = appointments ? groupAppointments(appointments) : null;
  const current = groups ? [...groups.needsOutcome, ...groups.upcoming] : [];
  const past = groups?.history ?? [];
  const cardProps = {
    showDate: true,
    onEdit: (appt: Appointment) => setForm({ kind: "edit", appt }),
    onCancel: setCancelling,
    onQuickAction: runQuickAction,
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50">
            <CalendarDays size={20} className="text-teal-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">Appointments</h2>
            <p className="text-xs text-slate-500">
              {groups ? `${groups.upcoming.length} upcoming` : "Booked sessions with this patient"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setForm({ kind: "book", patientId })}
            className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-teal-700"
          >
            <Plus size={16} />
            Book appointment
          </button>
          <button onClick={() => setExpanded(!expanded)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-50" aria-label="Toggle appointments">
            {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-4">
          {loadError ? (
            <p className="py-4 text-center text-sm text-rose-600">{loadError}</p>
          ) : !appointments ? (
            <p className="py-4 text-center text-sm text-slate-400">Loading...</p>
          ) : appointments.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-400">No appointments yet.</p>
          ) : (
            <div className="space-y-3">
              {current.map((a) => (
                <AppointmentCard key={a.appointment_id} appt={a} {...cardProps} />
              ))}
              {past.length > 0 && (
                <>
                  <p className="pt-2 text-xs font-medium uppercase tracking-wide text-slate-400">Past</p>
                  <div className="space-y-3 opacity-80">
                    {(showAllPast ? past : past.slice(0, PAST_SHOWN)).map((a) => (
                      <AppointmentCard key={a.appointment_id} appt={a} {...cardProps} />
                    ))}
                  </div>
                  {past.length > PAST_SHOWN && (
                    <button onClick={() => setShowAllPast((v) => !v)} className="text-sm text-teal-600 hover:underline">
                      {showAllPast ? "Show fewer" : `Show all ${past.length} past appointments`}
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {form && <AppointmentFormModal mode={form} onClose={() => setForm(null)} onSaved={afterSave} />}
      {cancelling && <CancelAppointmentModal appt={cancelling} onClose={() => setCancelling(null)} onSaved={afterSave} />}
    </section>
  );
}
