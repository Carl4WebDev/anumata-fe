import { Link } from "react-router-dom";
import { Users, AlertTriangle, ClipboardCheck, Activity } from "lucide-react";
import { usePatients } from "../../context/patients/usePatients";

export default function DashboardPage() {
  const { patients } = usePatients();

  const totalPatients = patients.length;
  const highRisk = patients.filter((p) => p.risk === "High").length;
  const recentPatients = patients.slice(0, 4);

  const stats = [
    { title: "Total Patients", value: totalPatients, icon: Users },
    { title: "Pending Interviews", value: 0, icon: ClipboardCheck },
    { title: "High Risk Cases", value: highRisk, icon: AlertTriangle },
    { title: "Completed This Week", value: 0, icon: Activity },
  ];

  return (
    <div className="space-y-6 md:space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 md:text-4xl">Therapist Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500 md:mt-2 md:text-base">
          Monitor patients, interviews, and emotional reports.
        </p>
      </div>

      {/* Stat Cards */}
      <section className="grid grid-cols-2 gap-3 md:gap-6 lg:grid-cols-4">
        {stats.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-slate-500 md:text-sm">{item.title}</p>
                  <h2 className="mt-1 text-2xl font-bold md:mt-2 md:text-3xl">{item.value}</h2>
                </div>
                <Icon size={24} className="shrink-0 text-blue-600 md:hidden" />
                <Icon size={28} className="hidden shrink-0 text-blue-600 md:block" />
              </div>
            </div>
          );
        })}
      </section>

      {/* Content Grid */}
      <section className="grid gap-6 lg:grid-cols-3">
        {/* Recent Patients */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between md:mb-6">
            <h2 className="text-lg font-semibold md:text-xl">Recent Patients</h2>
            <Link to="/patients" className="text-sm font-medium text-blue-600 hover:underline">
              View All
            </Link>
          </div>
          {recentPatients.length > 0 ? (
            <div className="space-y-3 md:space-y-4">
              {recentPatients.map((patient) => (
                <div key={patient.id} className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <Link to={`/patients/${patient.id}`} className="text-sm font-medium hover:text-blue-600 md:text-base">
                      {patient.name}
                    </Link>
                    <p className="text-xs text-slate-500 md:text-sm">{patient.lastInterview}</p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold md:py-1 ${
                      patient.risk === "High"
                        ? "bg-red-50 text-red-600"
                        : patient.risk === "Moderate"
                          ? "bg-yellow-50 text-yellow-600"
                          : patient.risk === "Low"
                            ? "bg-green-50 text-green-600"
                            : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {patient.risk}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-slate-400">No patients yet. Add one to get started.</p>
          )}
        </div>

        {/* Risk Overview */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
          <h2 className="mb-4 text-lg font-semibold md:mb-6 md:text-xl">Risk Overview</h2>
          <div className="space-y-4">
            {[
              { label: "High Risk", count: patients.filter((p) => p.risk === "High").length, color: "bg-red-500" },
              { label: "Moderate Risk", count: patients.filter((p) => p.risk === "Moderate").length, color: "bg-yellow-500" },
              { label: "Low Risk", count: patients.filter((p) => p.risk === "Low").length, color: "bg-green-500" },
            ].map((item) => {
              const max = totalPatients || 1;
              return (
                <div key={item.label}>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-500">{item.label}</p>
                    <span className="text-xs text-slate-400">{item.count}</span>
                  </div>
                  <div className="mt-2 h-3 w-full rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${item.color} transition-all`}
                      style={{ width: `${(item.count / max) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
