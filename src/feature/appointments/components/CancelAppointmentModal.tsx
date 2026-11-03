import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { appointmentsApi, type Appointment } from "../../../shared/api/appointmentsApi";
import { formatDateTime } from "../utils/appointmentUtils";
import ChoiceInput from "../../../shared/components/ChoiceInput";
import { CANCEL_REASONS } from "../../../shared/constants/choices";

interface CancelAppointmentModalProps {
  appt: Appointment;
  onClose: () => void;
  onSaved: (message: string) => void;
}

export default function CancelAppointmentModal({ appt, onClose, onSaved }: CancelAppointmentModalProps) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // In a recurring series with later sessions: this one only, or this and all following.
  const hasLaterSessions = Boolean(appt.series_id && appt.series_index && appt.series_total && appt.series_index < appt.series_total);
  const [scope, setScope] = useState<"one" | "following">("one");

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await appointmentsApi.cancel(appt.appointment_id, reason.trim() || undefined, scope);
      onSaved("cancelled" in result ? `${result.cancelled} sessions cancelled` : "Appointment cancelled");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-1 text-lg font-semibold text-[#08132E]">Cancel appointment</h3>
        <p className="mb-4 text-sm text-slate-500">
          {appt.patient_name} · {formatDateTime(appt.start_at)}
          {appt.series_index && appt.series_total ? ` · session ${appt.series_index} of ${appt.series_total}` : ""}
        </p>
        {hasLaterSessions && (
          <fieldset className="mb-4 space-y-1.5 rounded-xl border border-slate-200 p-3 text-sm text-slate-700">
            <legend className="px-1 text-xs font-medium text-slate-500">This is part of a recurring series</legend>
            <label className="flex items-center gap-2">
              <input type="radio" name="cancel-scope" checked={scope === "one"} onChange={() => setScope("one")} className="accent-rose-600" />
              Only this session
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="cancel-scope" checked={scope === "following"} onChange={() => setScope("following")} className="accent-rose-600" />
              This and all following sessions
            </label>
          </fieldset>
        )}
        <label className="mb-1 block text-sm font-medium text-slate-600">
          Reason <span className="font-normal text-slate-400">(optional)</span>
        </label>
        <ChoiceInput
          value={reason}
          onChange={setReason}
          options={CANCEL_REASONS}
          placeholder="Select a reason…"
          otherPlaceholder="Describe the reason"
          ariaLabel="Cancellation reason"
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500"
        />
        <p className="mt-2 text-xs text-slate-400">The appointment stays in the history and the time becomes free again.</p>
        {error && (
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} disabled={busy} className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
            Keep appointment
          </button>
          <button
            onClick={submit}
            disabled={busy}
            className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
          >
            {busy ? "Cancelling…" : "Cancel appointment"}
          </button>
        </div>
      </div>
    </div>
  );
}
