import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  AlertTriangle,
  ClipboardCheck,
  Activity,
  UserPlus,
  ArrowRight,
  CalendarClock,
  CalendarCheck,
  CalendarX,
  CalendarRange,
  Link2,
  ListPlus,
  RefreshCw,
} from "lucide-react";
import { usePatients } from "../../context/patients/usePatients";
import { useSessions } from "../../context/sessions/useSessions";
import { useInterviewLinks } from "../../context/interviewLinks/useInterviewLinks";
import { followUpsApi } from "../../../shared/api/followUpsApi";
import type { FollowUp, FollowUpCounts } from "../../../shared/api/followUpsApi";
import { dashboardApi } from "../../../shared/api/dashboardApi";
import type { MappedSession } from "../../../shared/types/session";
import { DashboardSkeleton } from "../../../shared/components/Skeleton";
import EmptyState from "../../../shared/components/EmptyState";
import AddPatientModal from "../../patients/modals/AddPatientModal";
import GenerateLinkModal from "../../interviewLinks/modals/GenerateLinkModal";
import {
  countCompletedThisWeek,
  sessionsNeedingAttention,
  recentInterviews,
} from "../utils/dashboardMetrics";

function reportStatusChip(session: MappedSession) {
  const source = session.report?.report_source;
  if (session.report === null) {
    return <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">No report</span>;
  }
  if (source && source !== "llm") {
    return <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">Fallback report</span>;
  }
  return <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">AI report ready</span>;
}

export default function DashboardPage() {
  const { patients, loading, error, addPatient } = usePatients();
  const { sessions, loading: sessionsLoading, error: sessionsError } = useSessions();
  const { generateLink } = useInterviewLinks();

  const [followUpCounts, setFollowUpCounts] = useState<FollowUpCounts | null>(null);
  const [upcomingFollowUps, setUpcomingFollowUps] = useState<FollowUp[]>([]);
  const [followUpsError, setFollowUpsError] = useState(false);
  const [pendingInterviews, setPendingInterviews] = useState<number | null>(null);
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);

  useEffect(() => {
    followUpsApi.getCounts().then((res) => setFollowUpCounts(res.data)).catch(() => setFollowUpsError(true));
    followUpsApi.getUpcoming(5).then((res) => setUpcomingFollowUps(res.data || [])).catch(() => setFollowUpsError(true));
    dashboardApi.getStats().then((res) => setPendingInterviews(res.data.pendingInterviews)).catch(() => {});
  }, []);

  const attention = useMemo(() => sessionsNeedingAttention(sessions), [sessions]);
  const recent = useMemo(() => recentInterviews(sessions, 4), [sessions]);
  const completedThisWeek = useMemo(() => countCompletedThisWeek(sessions), [sessions]);

  // Fetch failures mean the data is unknown — show "—", never a fabricated 0,
  // and hide create actions (their guards depend on the failed data).
  const patientsOk = !error;
  const sessionsOk = !sessionsError;

  const stats = [
    {
      title: "Total Patients",
      value: patientsOk ? patients.length : "—",
      caption: "Registered",
      icon: Users,
      color: "text-teal-600",
      bg: "bg-teal-50",
      border: "border-l-teal-500",
      to: "/patients",
    },
    {
      title: "Pending Interviews",
      value: pendingInterviews ?? "—",
      caption: "Links awaiting completion",
      icon: ClipboardCheck,
      color: "text-amber-600",
      bg: "bg-amber-50",
      border: "border-l-amber-500",
      to: "/interview-links",
    },
    {
      title: "Sessions Requiring Review",
      value: sessionsOk ? attention.length : "—",
      caption: "Missing or fallback AI report",
      icon: AlertTriangle,
      color: "text-red-600",
      bg: "bg-red-50",
      border: "border-l-red-500",
      to: "/reports",
    },
    {
      title: "Completed This Week",
      value: sessionsOk ? completedThisWeek : "—",
      caption: "Since Monday (local time)",
      icon: Activity,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      border: "border-l-emerald-500",
      to: "/reports",
    },
  ];

  if (loading || sessionsLoading) {
    return <DashboardSkeleton label="Loading dashboard…" />;
  }

  return (
    <div className="space-y-6 md:space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">Therapist Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">
          Monitor interviews, emotional indicators, and session reports.
        </p>
      </div>

      {(error || sessionsError) && (
        <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{error || sessionsError}</p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-red-700 hover:underline"
          >
            <RefreshCw size={14} />
            Retry
          </button>
        </div>
      )}

      {/* Stat Cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.title}
              to={item.to}
              className={`rounded-xl border border-slate-200 border-l-4 ${item.border} bg-white p-5 shadow-sm transition-shadow hover:shadow-md`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{item.title}</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">{item.value}</p>
                  <p className="mt-1 text-xs text-slate-400">{item.caption}</p>
                </div>
                <div className={`rounded-lg ${item.bg} p-2.5`}>
                  <Icon size={20} className={item.color} />
                </div>
              </div>
            </Link>
          );
        })}
      </section>

      {/* Processing issues notice — only when attention is needed */}
      {sessionsOk && attention.length > 0 && (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-600" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-amber-800">
                {attention.length} {attention.length === 1 ? "session needs" : "sessions need"} review — missing or
                fallback AI reports.
              </p>
              <div className="mt-2 space-y-1">
                {attention.slice(0, 2).map(({ session, reason }) => (
                  <Link
                    key={session.id}
                    to={`/sessions/${session.id}`}
                    className="flex flex-wrap items-center gap-2 text-sm text-amber-700 hover:underline"
                  >
                    <span className="font-medium">{session.patientName}</span>
                    <span>&middot;</span>
                    <span>{session.date}</span>
                    <span>&middot;</span>
                    <span>{reason}</span>
                  </Link>
                ))}
              </div>
              <Link
                to="/reports"
                className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-amber-800 hover:underline"
              >
                View all in Reports
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Quick Actions */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Quick Actions</p>
          {patientsOk && (
            <>
              <button
                onClick={() => setShowAddPatient(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700"
              >
                <UserPlus size={15} />
                Add Patient
              </button>
            </>
          )}
          <Link
            to="/question-sets"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <ListPlus size={15} />
            Create Question Set
          </Link>
          {patientsOk && (
            <button
              onClick={() => setShowLinkModal(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <Link2 size={15} />
              Generate Interview Link
            </button>
          )}
        </div>
      </section>

      {/* Follow-up Stats */}
      {followUpCounts && (
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 md:gap-4">
          {[
            { label: "Upcoming", value: followUpCounts.upcoming, icon: CalendarClock, color: "text-blue-600", bg: "bg-blue-50", border: "border-l-blue-500" },
            { label: "Due Today", value: followUpCounts.due_today, icon: CalendarCheck, color: "text-teal-600", bg: "bg-teal-50", border: "border-l-teal-500" },
            { label: "Overdue", value: followUpCounts.overdue, icon: CalendarX, color: "text-red-600", bg: "bg-red-50", border: "border-l-red-500" },
            { label: "Completed", value: followUpCounts.completed ?? "—", icon: CalendarCheck, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-l-emerald-500" },
            { label: "Cancelled / Missed", value: followUpCounts.cancelled_or_missed ?? "—", icon: CalendarRange, color: "text-slate-500", bg: "bg-slate-50", border: "border-l-slate-400" },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className={`rounded-xl border border-slate-200 border-l-4 ${item.border} bg-white p-4 shadow-sm`}>
                <div className="flex items-center gap-3">
                  <div className={`rounded-lg ${item.bg} p-2`}><Icon size={18} className={item.color} /></div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{item.label}</p>
                    <p className="text-2xl font-bold text-slate-900">{item.value}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* Content Grid */}
      <section className="grid gap-6 lg:grid-cols-3">
        {/* Recent Interviews */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:p-6 lg:col-span-2">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">Recent Interviews</h2>
            <Link
              to="/patients"
              className="inline-flex items-center gap-1 text-sm font-medium text-teal-600 hover:text-teal-700"
            >
              View All
              <ArrowRight size={14} />
            </Link>
          </div>
          {!sessionsOk ? (
            <EmptyState
              icon={AlertTriangle}
              title="Couldn't load interviews"
              description="Session data is unavailable right now. Retry to see recent interviews."
            />
          ) : recent.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {recent.map((session) => (
                <Link
                  key={session.id}
                  to={`/sessions/${session.id}`}
                  className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0 hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900">{session.patientName}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {session.templateName} — {session.date}
                    </p>
                  </div>
                  {reportStatusChip(session)}
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Users}
              title="No interviews yet"
              description="Add a patient and generate an interview link to get started."
              action={
                patientsOk ? (
                  <button
                    onClick={() => setShowAddPatient(true)}
                    className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700"
                  >
                    <UserPlus size={16} />
                    Add Patient
                  </button>
                ) : undefined
              }
            />
          )}
        </div>

        {/* Upcoming Follow-ups */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">Upcoming Follow-ups</h2>
            <Link
              to="/patients"
              className="inline-flex items-center gap-1 text-sm font-medium text-teal-600 hover:text-teal-700"
            >
              View All
              <ArrowRight size={14} />
            </Link>
          </div>
          {followUpsError ? (
            <p className="py-8 text-center text-sm text-slate-400">Follow-ups unavailable.</p>
          ) : upcomingFollowUps.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {upcomingFollowUps.map((fu) => (
                <Link
                  key={fu.follow_up_id}
                  to={`/patients/${fu.patient_id}`}
                  className="flex items-center justify-between py-3 first:pt-0 last:pb-0 hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900">{fu.patient_name}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(fu.recommended_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      {fu.appointment_time && ` · ${fu.appointment_time.slice(0, 5)}`}
                    </p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    fu.status === "scheduled" ? "bg-teal-50 text-teal-700" : "bg-blue-50 text-blue-700"
                  }`}>
                    {fu.status === "scheduled" ? "Scheduled" : "Recommended"}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-slate-400">No upcoming follow-ups.</p>
          )}
        </div>
      </section>

      <AddPatientModal
        isOpen={showAddPatient}
        onClose={() => setShowAddPatient(false)}
        onSave={addPatient}
        existingNames={patients.map((p: { name: string }) => p.name)}
      />
      <GenerateLinkModal
        isOpen={showLinkModal}
        onClose={() => setShowLinkModal(false)}
        onGenerate={generateLink}
      />
    </div>
  );
}
