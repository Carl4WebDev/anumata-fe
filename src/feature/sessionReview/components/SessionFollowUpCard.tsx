import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { CalendarClock, CalendarPlus, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { followUpsApi } from "../../../shared/api/followUpsApi";
import type { FollowUp } from "../../../shared/api/followUpsApi";
import { useToast } from "../../../shared/context/ToastContext";
import AppointmentFormModal from "../../appointments/components/AppointmentFormModal";
import { formatDateTime } from "../../appointments/utils/appointmentUtils";
import ChoiceInput from "../../../shared/components/ChoiceInput";
import { FOLLOW_UP_REASONS, formatClock, timeOptions } from "../../../shared/constants/choices";
import { TextBlockSkeleton } from "../../../shared/components/Skeleton";

const FOLLOW_UP_TIMES = timeOptions("06:00", "21:00", 30);

interface SessionFollowUpCardProps {
  sessionId: number;
  patientId: number;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(timeStr: string | null): string {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(":");
  const hour = parseInt(h);
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${m} ${ampm}`;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  recommended: { label: "Recommended", color: "bg-blue-50 text-blue-700 border-blue-200" },
  scheduled: { label: "Scheduled", color: "bg-teal-50 text-teal-700 border-teal-200" },
  completed: { label: "Completed", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  cancelled: { label: "Cancelled", color: "bg-slate-100 text-slate-600 border-slate-200" },
  missed: { label: "Missed", color: "bg-red-50 text-red-700 border-red-200" },
};

export default function SessionFollowUpCard({ sessionId, patientId }: SessionFollowUpCardProps) {
  const { success, error: showError } = useToast();
  const [followUp, setFollowUp] = useState<FollowUp | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [booking, setBooking] = useState(false);

  const fetchFollowUp = useCallback(async () => {
    setLoading(true);
    setFetchError(false);
    try {
      const res = await followUpsApi.getByPatientId(Number(patientId));
      const list = res.data || [];
      setFollowUp(list.find((f) => f.session_id === Number(sessionId)) || null);
    } catch {
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }, [patientId, sessionId]);

  useEffect(() => {
    fetchFollowUp();
  }, [fetchFollowUp]);

  const handleCreate = async () => {
    if (!date) return;
    setSaving(true);
    try {
      const res = await followUpsApi.create(Number(patientId), {
        recommended_date: date,
        appointment_time: time || undefined,
        reason: reason || undefined,
        session_id: Number(sessionId),
      });
      setFollowUp(res.data);
      setShowForm(false);
      success("Patient advised to return.");
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : "Failed to save follow-up");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!followUp) return;
    try {
      const res = await followUpsApi.update(followUp.follow_up_id, { status: newStatus });
      setFollowUp(res.data);
      success(`Follow-up marked as ${newStatus}.`);
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : "Failed to update follow-up");
    }
  };

  return (
    <section className="rounded-xl border border-teal-200 bg-teal-50/30 p-5 shadow-sm md:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-100">
            <CalendarClock size={20} className="text-teal-700" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">Follow-up Recommendation</h2>
            <p className="text-xs text-slate-500">Advise the patient to come back for this interview record</p>
          </div>
        </div>
        {!followUp && !showForm && !loading && !fetchError && (
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-teal-700"
          >
            <CalendarPlus size={16} />
            Advise Return
          </button>
        )}
      </div>

      {/* Loading */}
      {loading && <TextBlockSkeleton lines={2} label="Loading follow-up status…" />}

      {/* Form — no follow-up yet */}
      {!loading && showForm && (
        <div className="rounded-lg border border-teal-200 bg-white p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Return Date *</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Preferred time (optional)</label>
              <select
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              >
                <option value="">Any time</option>
                {FOLLOW_UP_TIMES.map((t) => (
                  <option key={t} value={t}>
                    {formatClock(t)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-3">
            <label className="mb-1 block text-xs font-medium text-slate-600">Reason / Note (optional)</label>
            <ChoiceInput
              value={reason}
              onChange={setReason}
              options={FOLLOW_UP_REASONS}
              placeholder="Select a reason…"
              otherPlaceholder="e.g., Follow up on anxiety management progress"
              ariaLabel="Follow-up reason"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
            />
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <button
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={!date || saving}
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Advise Return"}
            </button>
          </div>
        </div>
      )}

      {/* Advised — show return notice */}
      {!loading && followUp && !showForm && (
        <div>
          <div className="rounded-lg border border-teal-200 bg-white p-4">
            <div className="flex items-start gap-3">
              <CalendarClock size={18} className="mt-0.5 shrink-0 text-teal-600" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-teal-900">
                  Patient is advised to come back on {formatDate(followUp.recommended_date)}
                  {followUp.appointment_time && ` at ${formatTime(followUp.appointment_time)}`}
                </p>
                {followUp.reason && (
                  <p className="mt-1 text-sm text-slate-600">{followUp.reason}</p>
                )}
                <div className="mt-2 flex items-center gap-2">
                  <span
                    className={`rounded-full border px-2 py-0.5 text-xs font-medium ${statusConfig[followUp.status]?.color || statusConfig.recommended.color}`}
                  >
                    {statusConfig[followUp.status]?.label || followUp.status}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Booked: status follows the appointment */}
          {followUp.appointment_start_at && (
            <p className="mt-3 text-xs text-slate-500">
              Booked for <span className="font-medium text-slate-700">{formatDateTime(followUp.appointment_start_at)}</span>.{" "}
              <Link to="/appointments" className="text-teal-600 hover:underline">
                Reschedule or close it in Appointments
              </Link>
              .
            </p>
          )}

          {/* Status actions — only while no appointment is booked */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {!followUp.appointment_id && (followUp.status === "recommended" || followUp.status === "missed") && (
              <button
                onClick={() => setBooking(true)}
                className="inline-flex items-center gap-1 rounded-lg border border-teal-200 bg-teal-50 px-2.5 py-1.5 text-xs font-medium text-teal-700 transition hover:bg-teal-100"
              >
                <CalendarPlus size={12} /> {followUp.status === "missed" ? "Rebook appointment" : "Book appointment"}
              </button>
            )}
            {!followUp.appointment_id && (followUp.status === "recommended" || followUp.status === "scheduled") && (
              <>
                <button
                  onClick={() => handleStatusChange("completed")}
                  className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100"
                >
                  <CheckCircle2 size={12} /> Mark Completed
                </button>
                <button
                  onClick={() => handleStatusChange("cancelled")}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
                >
                  <XCircle size={12} /> Cancel
                </button>
              </>
            )}
            {!followUp.appointment_id && followUp.status === "scheduled" && (
              <button
                onClick={() => handleStatusChange("missed")}
                className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-100"
              >
                <AlertCircle size={12} /> Mark Missed
              </button>
            )}
          </div>
        </div>
      )}

      {/* Fetch error — unknown state, don't offer create */}
      {!loading && fetchError && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-2">
            <AlertCircle size={16} className="mt-0.5 shrink-0 text-amber-600" />
            <div>
              <p className="text-sm font-medium text-amber-800">Could not load follow-up status.</p>
              <button
                onClick={fetchFollowUp}
                className="mt-1 text-xs font-medium text-amber-700 underline hover:text-amber-900"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && !followUp && !showForm && !fetchError && (
        <p className="py-3 text-sm text-slate-400">
          No return recommendation for this interview yet.
        </p>
      )}

      {booking && followUp && (
        <AppointmentFormModal
          mode={{
            kind: "book",
            patientId: Number(patientId),
            followUp: { id: followUp.follow_up_id, recommendedDate: followUp.recommended_date, reason: followUp.reason },
          }}
          onClose={() => setBooking(false)}
          onSaved={(message) => {
            setBooking(false);
            success(`${message} — follow-up is now scheduled.`);
            fetchFollowUp();
          }}
        />
      )}
    </section>
  );
}
