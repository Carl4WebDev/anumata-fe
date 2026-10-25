import { useState, useEffect, useCallback } from "react";
import { CalendarClock, Plus, Check, X, Clock, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { followUpsApi } from "../../../shared/api/followUpsApi";
import type { FollowUp } from "../../../shared/api/followUpsApi";
import { useToast } from "../../../shared/context/ToastContext";

interface FollowUpSectionProps {
  patientId: number;
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
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const followDate = new Date(fu.recommended_date);
  if (followDate < today) return "missed";
  return fu.status;
}

export default function FollowUpSection({ patientId }: FollowUpSectionProps) {
  const { success, error: showError } = useToast();
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState(true);
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
  }, [fetchFollowUps]);

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
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : "Failed to update follow-up");
    }
  };

  const handleReschedule = async (id: number) => {
    const newDate = prompt("Enter new date (YYYY-MM-DD):");
    if (!newDate) return;
    try {
      await followUpsApi.update(id, { recommended_date: newDate, status: "scheduled" });
      success("Follow-up rescheduled.");
      fetchFollowUps();
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : "Failed to reschedule");
    }
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
                Next: {formatDate(nextFollowUp.recommended_date)}
                {nextFollowUp.appointment_time && ` at ${formatTime(nextFollowUp.appointment_time)}`}
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
              <label className="mb-1 block text-xs font-medium text-slate-600">Time (optional)</label>
              <input
                type="time"
                value={formData.appointment_time}
                onChange={(e) => setFormData((p) => ({ ...p, appointment_time: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              />
            </div>
          </div>
          <div className="mt-3">
            <label className="mb-1 block text-xs font-medium text-slate-600">Reason / Note (optional)</label>
            <input
              type="text"
              value={formData.reason}
              onChange={(e) => setFormData((p) => ({ ...p, reason: e.target.value }))}
              placeholder="e.g., Follow-up on anxiety progress"
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
            <p className="py-4 text-center text-sm text-slate-400">Loading...</p>
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
                    </div>
                    <div className="flex items-center gap-1">
                      {(displayStatus === "recommended" || displayStatus === "scheduled") && (
                        <>
                          <button
                            onClick={() => handleReschedule(fu.follow_up_id)}
                            title="Reschedule"
                            className="rounded p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600"
                          >
                            <Clock size={14} />
                          </button>
                          <button
                            onClick={() => handleStatusChange(fu.follow_up_id, "scheduled")}
                            title="Mark Scheduled"
                            className="rounded p-1.5 text-slate-400 hover:bg-teal-50 hover:text-teal-600"
                          >
                            <CalendarClock size={14} />
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
                          onClick={() => handleReschedule(fu.follow_up_id)}
                          title="Reschedule"
                          className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100"
                        >
                          <AlertTriangle size={12} />
                          Reschedule
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
    </section>
  );
}