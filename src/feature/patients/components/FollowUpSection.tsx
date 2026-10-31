import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { CalendarClock, CalendarPlus, Plus, Check, X, ChevronDown, ChevronUp } from "lucide-react";
import { followUpsApi } from "../../../shared/api/followUpsApi";
import type { FollowUp } from "../../../shared/api/followUpsApi";
import { useToast } from "../../../shared/context/ToastContext";
import AppointmentFormModal from "../../appointments/components/AppointmentFormModal";
import { formatDateTime } from "../../appointments/utils/appointmentUtils";
import ChoiceInput from "../../../shared/components/ChoiceInput";
import { FOLLOW_UP_REASONS, formatClock, timeOptions } from "../../../shared/constants/choices";
import { TextBlockSkeleton } from "../../../shared/components/Skeleton";

const FOLLOW_UP_TIMES = timeOptions("06:00", "21:00", 30);

interface FollowUpSectionProps {
  patientId: number;
  /** Bumped by the page whenever appointments or follow-ups change elsewhere. */
  refreshKey?: number;
  /** Tell the page something changed (appointments may have moved too). */
  onChanged?: () => void;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  recommended: { label: "Recommended", color: "bg-blue-50 text-blue-700 border-blue-200" },
  scheduled: { label: "Scheduled", color: "bg-teal-50 text-teal-700 border-teal-200" },
  completed: { label: "Completed", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  cancelled: { label: "Cancelled", color: "bg-slate-100 text-slate-600 border-slate-200" },
  missed: { label: "Missed", color: "bg-red-50 text-red-700 border-red-200" },
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
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

function getStatus(fu: FollowUp): string {
  if (fu.status === "completed" || fu.status === "cancelled" || fu.status === "missed") {
    return fu.status;
  }
  // A booked follow-up stays "scheduled" until its appointment is closed.
  if (fu.appointment_id) return "scheduled";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const followDate = new Date(fu.recommended_date);
  if (followDate < today) return "missed";
  return fu.status;
}

export default function FollowUpSection({ patientId, refreshKey = 0, onChanged }: FollowUpSectionProps) {
  const { success, error: showError } = useToast();
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [booking, setBooking] = useState<FollowUp | null>(null);
  const [formData, setFormData] = useState({
    recommended_date: "",
    appointment_time: "",
    reason: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchFollowUps = useCallback(async () => {
    try {
      const res = await followUpsApi.getByPatientId(patientId);
      setFollowUps(res.data || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    fetchFollowUps();
  }, [fetchFollowUps, refreshKey]);

  const handleCreate = async () => {
    if (!formData.recommended_date) return;
    setSubmitting(true);
    try {
      await followUpsApi.create(patientId, {
        recommended_date: formData.recommended_date,
        appointment_time: formData.appointment_time || undefined,
        reason: formData.reason || undefined,
      });
      success("Follow-up recommendation saved.");
      setFormData({ recommended_date: "", appointment_time: "", reason: "" });
      setShowForm(false);
      fetchFollowUps();
      onChanged?.();
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : "Failed to create follow-up");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (id: number, newStatus: string) => {
    try {
      await followUpsApi.update(id, { status: newStatus });
      success(`Follow-up marked as ${newStatus}.`);
      fetchFollowUps();
      onChanged?.();
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : "Failed to update follow-up");
    }
  };

  const handleBooked = (message: string) => {
    setBooking(null);
    success(`${message} — follow-up is now scheduled.`);
    fetchFollowUps();
    onChanged?.();
  };

  const nextFollowUp = followUps.length > 0
    ? followUps
        .filter((f) => f.status === "recommended" || f.status === "scheduled")
        .sort((a, b) => a.recommended_date.localeCompare(b.recommended_date))[0]
    : null;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50">
            <CalendarClock size={20} className="text-teal-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-900">Follow-up Appointments</h2>
            {nextFollowUp && (
              <p className="text-xs text-slate-500">
                Next:{" "}
                {nextFollowUp.appointment_start_at
                  ? `${formatDateTime(nextFollowUp.appointment_start_at)} (booked)`
                  : `${formatDate(nextFollowUp.recommended_date)}${nextFollowUp.appointment_time ? ` at ${formatTime(nextFollowUp.appointment_time)}` : ""}`}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-teal-700"
          >
            <Plus size={16} />
            Advise Return
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-50"
          >
            {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Return Date *</label>
              <input
                type="date"
                value={formData.recommended_date}
                onChange={(e) => setFormData((p) => ({ ...p, recommended_date: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Preferred time (optional)</label>
              <select
                value={formData.appointment_time}
                onChange={(e) => setFormData((p) => ({ ...p, appointment_time: e.target.value }))}
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
              value={formData.reason}
              onChange={(reason) => setFormData((p) => ({ ...p, reason }))}
              options={FOLLOW_UP_REASONS}
              placeholder="Select a reason…"
              otherPlaceholder="e.g., Follow-up on anxiety progress"
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
              disabled={!formData.recommended_date || submitting}
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
            >
              {submitting ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      )}

      {/* Follow-up list */}
      {expanded && (
        <div className="mt-4">
          {loading ? (
            <TextBlockSkeleton lines={3} label="Loading follow-ups…" />
          ) : followUps.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-400">No follow-ups recorded. Click "Advise Return" to add one.</p>
          ) : (
            <div className="space-y-2">
              {followUps.map((fu) => {
                const displayStatus = getStatus(fu);
                const cfg = statusConfig[displayStatus] || statusConfig.recommended;
                return (
                  <div
                    key={fu.follow_up_id}
                    className="flex items-center justify-between rounded-lg border border-slate-100 p-3 hover:bg-slate-50"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-900">
                          {formatDate(fu.recommended_date)}
                        </span>
                        {fu.appointment_time && (
                          <span className="text-xs text-slate-500">
                            {formatTime(fu.appointment_time)}
                          </span>
                        )}
                        <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${cfg.color}`}>
                          {cfg.label}
                        </span>
                      </div>
                      {fu.reason && (
                        <p className="mt-0.5 text-xs text-slate-500">{fu.reason}</p>
                      )}
                      {fu.session_id && (
                        <p className="mt-0.5 text-xs text-slate-400">Linked to session #{fu.session_id}</p>
                      )}
                      {fu.appointment_start_at && (
                        <Link to="/appointments" className="mt-0.5 inline-block text-xs text-teal-600 hover:underline">
                          Booked for {formatDateTime(fu.appointment_start_at)} — manage in Appointments
                        </Link>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {!fu.appointment_id && (displayStatus === "recommended" || displayStatus === "scheduled") && (
                        <>
                          <button
                            onClick={() => setBooking(fu)}
                            title="Book appointment"
                            className="inline-flex items-center gap-1 rounded bg-teal-50 px-2 py-1 text-xs font-medium text-teal-700 hover:bg-teal-100"
                          >
                            <CalendarPlus size={12} />
                            Book
                          </button>
                          <button
                            onClick={() => handleStatusChange(fu.follow_up_id, "completed")}
                            title="Mark Completed"
                            className="rounded p-1.5 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            onClick={() => handleStatusChange(fu.follow_up_id, "cancelled")}
                            title="Cancel"
                            className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                          >
                            <X size={14} />
                          </button>
                        </>
                      )}
                      {displayStatus === "missed" && (
                        <button
                          onClick={() => setBooking(fu)}
                          title="Book a new appointment"
                          className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100"
                        >
                          <CalendarPlus size={12} />
                          Rebook
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {booking && (
        <AppointmentFormModal
          mode={{
            kind: "book",
            patientId,
            followUp: { id: booking.follow_up_id, recommendedDate: booking.recommended_date, reason: booking.reason },
          }}
          onClose={() => setBooking(null)}
          onSaved={handleBooked}
        />
      )}
    </section>
  );
}