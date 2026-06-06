import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Link2, ExternalLink } from "lucide-react";
import { usePatients } from "../../context/patients/usePatients";
import { useSessions } from "../../context/sessions/useSessions";

export default function PatientDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { patients } = usePatients();
  const { sessions } = useSessions();
  const patient = patients.find((p) => p.id === Number(id));

  if (!patient) {
    return (
      <div className="space-y-4">
        <Link to="/patients" className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline">
          <ArrowLeft size={16} />
          Back to Patients
        </Link>
        <p className="text-slate-500">Patient not found.</p>
      </div>
    );
  }

  const patientSessions = sessions.filter((s) => s.patientId === patient.id);

  // Compute latest emotion averages from sessions
  const avgEmotions = patientSessions.length > 0
    ? {
        sad: Math.round(patientSessions.reduce((sum, s) => sum + s.emotions.sad, 0) / patientSessions.length),
        happy: Math.round(patientSessions.reduce((sum, s) => sum + s.emotions.happy, 0) / patientSessions.length),
        angry: Math.round(patientSessions.reduce((sum, s) => sum + s.emotions.angry, 0) / patientSessions.length),
        neutral: Math.round(patientSessions.reduce((sum, s) => sum + s.emotions.neutral, 0) / patientSessions.length),
      }
    : null;

  const emotionColors: Record<string, string> = {
    sad: "bg-blue-500",
    happy: "bg-green-500",
    angry: "bg-red-500",
    neutral: "bg-slate-400",
  };

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link to="/patients" className="mb-2 inline-flex items-center gap-2 text-sm text-blue-600 hover:underline">
            <ArrowLeft size={16} />
            Back to Patients
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 md:text-4xl">{patient.name}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {patient.age} &middot; {patient.gender} &middot; {patient.concern}
          </p>
        </div>
        <button
          onClick={() => navigate("/interview-links")}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          <Link2 size={18} />
          Generate Interview Link
        </button>
      </div>

      {/* Stat Cards */}
      <section className="grid grid-cols-2 gap-3 md:gap-6 lg:grid-cols-4">
        {[
          { label: "Status", value: patient.status },
          { label: "Risk Level", value: patient.risk, color: patient.risk === "High" ? "text-red-600" : patient.risk === "Moderate" ? "text-yellow-600" : patient.risk === "Low" ? "text-green-600" : "" },
          { label: "Total Sessions", value: String(patientSessions.length) },
          { label: "Last Interview", value: patientSessions.length > 0 ? patientSessions[0].date : "N/A" },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
            <p className="text-xs text-slate-500 md:text-sm">{card.label}</p>
            <h3 className={`mt-1 text-lg font-semibold md:mt-2 md:text-xl ${card.color ?? ""}`}>{card.value}</h3>
          </div>
        ))}
      </section>

      {/* Content */}
      <section className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6 lg:col-span-2">
          <h2 className="mb-4 text-lg font-semibold md:mb-6 md:text-xl">Interview History</h2>
          {patientSessions.length > 0 ? (
            <div className="space-y-3">
              {patientSessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between rounded-xl border border-slate-200 p-4 transition hover:border-blue-200 hover:bg-blue-50/30"
                >
                  <div>
                    <span className="text-sm font-medium">{session.templateName}</span>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-xs text-slate-400">{session.date}</span>
                      <span className="text-xs text-slate-300">&middot;</span>
                      <span className="text-xs text-slate-400">{session.duration}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          session.riskLevel === "High"
                            ? "bg-red-50 text-red-600"
                            : session.riskLevel === "Moderate"
                              ? "bg-yellow-50 text-yellow-600"
                              : "bg-green-50 text-green-600"
                        }`}
                      >
                        {session.riskLevel}
                      </span>
                    </div>
                  </div>
                  <Link
                    to={`/sessions/${session.id}`}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:underline"
                  >
                    Review
                    <ExternalLink size={14} />
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-slate-400">No interviews yet. Generate an interview link to get started.</p>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
          <h2 className="mb-4 text-lg font-semibold md:mb-6 md:text-xl">Emotion Trend</h2>
          {avgEmotions ? (
            <div className="space-y-4">
              {Object.entries(avgEmotions)
                .sort(([, a], [, b]) => b - a)
                .map(([label, pct]) => (
                  <div key={label}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="capitalize">{label}</span>
                      <span className="text-slate-500">{pct}%</span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full ${emotionColors[label] ?? "bg-slate-400"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-slate-400">No emotion data yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}
