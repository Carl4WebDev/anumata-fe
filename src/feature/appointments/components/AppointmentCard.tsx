import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Check, X, Pencil, UserX, Clock, Repeat, Undo2 } from "lucide-react";
import { appointmentsApi, type Appointment } from "../../../shared/api/appointmentsApi";
import { statusStyles, formatDateTime, formatMinutes, formatTime, hasStarted, undoTimeLeft } from "../utils/appointmentUtils";
import PreSessionInterview from "./PreSessionInterview";

interface AppointmentCardProps {
  appt: Appointment;
  /** Show the date (history) or only the time (lists already grouped by day). */
  showDate?: boolean;
  onEdit: (appt: Appointment) => void;
  onCancel: (appt: Appointment) => void;
  onQuickAction: (fn: () => Promise<unknown>, successMessage: string) => void;
}

const btn = "flex items-center gap-1 rounded-xl px-3 py-1.5 text-sm";
const neutralBtn = `${btn} border border-slate-200 text-slate-600 hover:bg-slate-50`;

export default function AppointmentCard({ appt, showDate = false, onEdit, onCancel, onQuickAction }: AppointmentCardProps) {
  const status = statusStyles[appt.status];
  const scheduled = appt.status === "scheduled";
  const started = hasStarted(appt);
  const minutes = Math.round((Date.parse(appt.end_at) - Date.parse(appt.start_at)) / 60000);
  // Undo shows for a short while after the outcome was recorded, then hides itself.
  const [expiredAt, setExpiredAt] = useState<string | null>(null); // updated_at whose undo time ran out
  useEffect(() => {
    const left = undoTimeLeft(appt);
    if (left <= 0) return;
    const timer = setTimeout(() => setExpiredAt(appt.updated_at), left);
    return () => clearTimeout(timer);
  }, [appt]);
  const canUndo = undoTimeLeft(appt) > 0 && expiredAt !== appt.updated_at;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-medium text-teal-700">
            <Clock size={14} />
            {showDate ? formatDateTime(appt.start_at) : formatTime(appt.start_at)} – {formatTime(appt.end_at)}
            <span className="font-normal text-slate-500">
              {appt.session_type && ` · ${appt.session_type}`}
              {minutes > 0 && ` · ${formatMinutes(minutes)}`}
            </span>
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Link to={`/patients/${appt.patient_id}`} className="font-semibold text-[#08132E] hover:text-teal-700 hover:underline">
              {appt.patient_name}
            </Link>
            {!scheduled && (
              <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${status.className}`}>{status.label}</span>
            )}
            {appt.series_id && appt.series_index && appt.series_total && (
              <span className="flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-xs text-violet-700" title="Part of a recurring series">
                <Repeat size={11} /> Session {appt.series_index} of {appt.series_total}
              </span>
            )}
            {appt.follow_up_id && (
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-600" title="Booked from a follow-up recommendation">
                Follow-up
              </span>
            )}
          </div>
          {appt.reason && <p className="mt-1 text-sm text-slate-500">{appt.reason}</p>}
          {appt.cancel_reason && <p className="mt-1 text-sm text-slate-400">Cancelled: {appt.cancel_reason}</p>}
          <PreSessionInterview appt={appt} onQuickAction={onQuickAction} />
        </div>

        {scheduled && (
          <div className="flex flex-wrap gap-2">
            {started ? (
              <>
                <button
                  onClick={() => onQuickAction(() => appointmentsApi.complete(appt.appointment_id), "Marked as completed")}
                  className={`${btn} bg-teal-600 font-medium text-white hover:bg-teal-700`}
                >
                  <Check size={15} /> Completed
                </button>
                <button
                  onClick={() => onQuickAction(() => appointmentsApi.noShow(appt.appointment_id), "Recorded as no-show")}
                  className={neutralBtn}
                >
                  <UserX size={15} /> No-show
                </button>
              </>
            ) : (
              <button onClick={() => onEdit(appt)} className={neutralBtn}>
                <Pencil size={15} /> Edit
              </button>
            )}
            <button onClick={() => onCancel(appt)} className={`${btn} border border-rose-200 text-rose-600 hover:bg-rose-50`}>
              <X size={15} /> Cancel
            </button>
          </div>
        )}
        {!scheduled && canUndo && (
          <button
            onClick={() => onQuickAction(() => appointmentsApi.undo(appt.appointment_id), "Undone — the appointment is scheduled again")}
            className={neutralBtn}
            title="Available for 15 minutes after recording it"
          >
            <Undo2 size={15} /> Undo {status.label.toLowerCase()}
          </button>
        )}
      </div>
    </div>
  );
}
