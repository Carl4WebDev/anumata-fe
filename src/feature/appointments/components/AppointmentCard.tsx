import { Link } from "react-router-dom";
import { Check, X, Pencil, UserX, Clock } from "lucide-react";
import { appointmentsApi, type Appointment } from "../../../shared/api/appointmentsApi";
import { statusStyles, formatDateTime, formatTime, hasStarted } from "../utils/appointmentUtils";

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

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-medium text-teal-700">
            <Clock size={14} />
            {showDate ? formatDateTime(appt.start_at) : formatTime(appt.start_at)} – {formatTime(appt.end_at)}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Link to={`/patients/${appt.patient_id}`} className="font-semibold text-[#08132E] hover:text-teal-700 hover:underline">
              {appt.patient_name}
            </Link>
            {!scheduled && (
              <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${status.className}`}>{status.label}</span>
            )}
            {appt.follow_up_id && (
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-600" title="Booked from a follow-up recommendation">
                Follow-up
              </span>
            )}
          </div>
          {appt.reason && <p className="mt-1 text-sm text-slate-500">{appt.reason}</p>}
          {appt.cancel_reason && <p className="mt-1 text-sm text-slate-400">Cancelled: {appt.cancel_reason}</p>}
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
      </div>
    </div>
  );
}
