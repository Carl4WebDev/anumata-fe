import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Users, AlertTriangle, ClipboardCheck, Activity, UserPlus, ArrowRight, CalendarClock, CalendarCheck, CalendarX } from "lucide-react";
import { usePatients } from "../../context/patients/usePatients";
import { followUpsApi } from "../../../shared/api/followUpsApi";
import type { FollowUp, FollowUpCounts } from "../../../shared/api/followUpsApi";
import LoadingSpinner from "../../../shared/components/LoadingSpinner";
import EmptyState from "../../../shared/components/EmptyState";

export default function DashboardPage() {
  const { patients, loading, error } = usePatients();
  const [followUpCounts, setFollowUpCounts] = useState<FollowUpCounts | null>(null);
  const [upcomingFollowUps, setUpcomingFollowUps] = useState<FollowUp[]>([]);

  useEffect(() => {
    followUpsApi.getCounts().then((res) => setFollowUpCounts(res.data)).catch(() => {});
    followUpsApi.getUpcoming(5).then((res) => setUpcomingFollowUps(res.data || [])).catch(() => {});
  }, []);

  const totalPatients = patients.length;
  const highRisk = patients.filter((p) => p.risk === "High").length;
  const recentPatients = patients.slice(0, 4);

  const stats = [
    { title: "Total Patients", value: totalPatients, icon: Users, color: "text-teal-600", bg: "bg-teal-50", border: "border-l-teal-500" },
    { title: "Pending Interviews", value: 0, icon: ClipboardCheck, color: "text-amber-600", bg: "bg-amber-50", border: "border-l-amber-500" },
    { title: "Sessions Requiring Review", value: highRisk, icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50", border: "border-l-red-500" },
    { title: "Completed This Week", value: 0, icon: Activity, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-l-emerald-500" },
  ];

  if (loading) {
    return <LoadingSpinner message="Loading dashboard..." />;
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">Therapist Dashboard</h1>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">Therapist Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">
          Monitor interviews, emotional indicators, and session reports.
        </p>
      </div>

      {/* Stat Cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.title}
              className={`rounded-xl border border-slate-200 border-l-4 ${item.border} bg-white p-5 shadow-sm transition-shadow hover:shadow-md`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500">{item.title}</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">{item.value}</p>
                </div>
                <div className={`rounded-lg ${item.bg} p-2.5`}>
                  <Icon size={20} className={item.color} />
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* Follow-up Stats */}
      {followUpCounts && (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 border-l-4 border-l-blue-500 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-50 p-2"><CalendarClock size={18} className="text-blue-600" /></div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Upcoming</p>
                <p className="text-2xl font-bold text-slate-900">{followUpCounts.upcoming}</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 border-l-4 border-l-teal-500 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-teal-50 p-2"><CalendarCheck size={18} className="text-teal-600" /></div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Due Today</p>
                <p className="text-2xl font-bold text-slate-900">{followUpCounts.due_today}</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 border-l-4 border-l-red-500 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-red-50 p-2"><CalendarX size={18} className="text-red-600" /></div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Overdue</p>
                <p className="text-2xl font-bold text-slate-900">{followUpCounts.overdue}</p>
              </div>
            </div>
          </div>
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
          {recentPatients.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {recentPatients.map((patient) => (
                <div
                  key={patient.id}
                  className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <Link
                      to={`/patients/${patient.id}`}
                      className="text-sm font-medium text-slate-900 hover:text-teal-600"
                    >
                      {patient.name}
                    </Link>
                    <p className="mt-0.5 text-xs text-slate-500">{patient.lastInterview}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                      patient.risk === "High"
                        ? "bg-red-50 text-red-700"
                        : patient.risk === "Moderate"
                          ? "bg-amber-50 text-amber-700"
                          : patient.risk === "Low"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {patient.risk}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Users}
              title="No patients yet"
              description="Add your first patient to begin tracking emotional progress."
              action={
                <Link
                  to="/patients"
                  className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700"
                >
                  <UserPlus size={16} />
                  Add Patient
                </Link>
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
          {upcomingFollowUps.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {upcomingFollowUps.map((fu) => (
                <div key={fu.follow_up_id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
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
                </div>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-slate-400">No upcoming follow-ups.</p>
          )}
        </div>
      </section>
    </div>
  );
}