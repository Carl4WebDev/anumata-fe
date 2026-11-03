import { AlertTriangle } from "lucide-react";
import { formatDateTime, formatTime } from "../utils/appointmentUtils";

export interface ScheduleConflict {
  appointment_id: number;
  patient_name: string;
  start_at: string;
  end_at: string;
}

interface ScheduleConflictWarningProps {
  message: string;
  conflicts: ScheduleConflict[];
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * A schedule change (new hours, a blocked period) clashes with booked
 * appointments: list them and let the therapist decide before anything is saved.
 */
export default function ScheduleConflictWarning({ message, conflicts, busy, onConfirm, onCancel }: ScheduleConflictWarningProps) {
  return (
    <div role="alert" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      <p className="flex items-center gap-2 font-semibold">
        <AlertTriangle size={16} className="shrink-0" /> {message}
      </p>
      <ul className="mt-2 space-y-1">
        {conflicts.map((c) => (
          <li key={c.appointment_id} className="rounded-lg bg-white/70 px-3 py-1.5">
            <span className="font-medium">{c.patient_name}</span> — {formatDateTime(c.start_at)}–{formatTime(c.end_at)}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-amber-800">
        Saving keeps these appointments booked. Reschedule or cancel them from your appointment list, and let the
        patients know.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={onConfirm}
          disabled={busy}
          className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save anyway"}
        </button>
        <button onClick={onCancel} disabled={busy} className="rounded-xl border border-amber-300 px-4 py-2 text-sm text-amber-800 hover:bg-amber-100">
          Go back
        </button>
      </div>
    </div>
  );
}
