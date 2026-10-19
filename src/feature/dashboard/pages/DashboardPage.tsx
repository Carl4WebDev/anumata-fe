import { Link } from "react-router-dom";
import { Users, AlertTriangle, ClipboardCheck, Activity, UserPlus, ArrowRight } from "lucide-react";
import { usePatients } from "../../context/patients/usePatients";
import LoadingSpinner from "../../../shared/components/LoadingSpinner";
import EmptyState from "../../../shared/components/EmptyState";

export default function DashboardPage() {
  const { patients, loading, error } = usePatients();

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

        {/* Session Risk Distribution */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <h2 className="mb-5 text-base font-semibold text-slate-900">Session Risk Distribution</h2>
          {totalPatients > 0 ? (
            <div className="space-y-5">
              {[
                { label: "High Risk", count: patients.filter((p) => p.risk === "High").length, color: "bg-red-500" },
                { label: "Moderate Risk", count: patients.filter((p) => p.risk === "Moderate").length, color: "bg-amber-500" },
                { label: "Low Risk", count: patients.filter((p) => p.risk === "Low").length, color: "bg-emerald-500" },
              ].map((item) => {
                const max = totalPatients || 1;
                return (
                  <div key={item.label}>
                    <div className="mb-1.5 flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-700">{item.label}</p>
                      <span className="text-sm font-semibold text-slate-900">{item.count}</span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full ${item.color} transition-all duration-500`}
                        style={{ width: `${(item.count / max) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-slate-400">No patient data yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}
