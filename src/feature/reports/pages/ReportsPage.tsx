import { useSessions } from "../../context/sessions/useSessions";
import { usePatients } from "../../context/patients/usePatients";
import { Link } from "react-router-dom";
import { TrendingDown, TrendingUp, AlertTriangle, Users, Activity } from "lucide-react";

export default function ReportsPage() {
  const { sessions } = useSessions();
  const { patients } = usePatients();

  // Compute stats
  const totalSessions = sessions.length;
  const highRisk = sessions.filter((s) => s.riskLevel === "High").length;
  const moderateRisk = sessions.filter((s) => s.riskLevel === "Moderate").length;
  const lowRisk = sessions.filter((s) => s.riskLevel === "Low").length;

  // Aggregate emotions across all sessions
  const avgEmotions = totalSessions > 0
    ? {
        sad: Math.round(sessions.reduce((sum, s) => sum + s.emotions.sad, 0) / totalSessions),
        happy: Math.round(sessions.reduce((sum, s) => sum + s.emotions.happy, 0) / totalSessions),
        angry: Math.round(sessions.reduce((sum, s) => sum + s.emotions.angry, 0) / totalSessions),
        neutral: Math.round(sessions.reduce((sum, s) => sum + s.emotions.neutral, 0) / totalSessions),
      }
    : { sad: 0, happy: 0, angry: 0, neutral: 0 };

  // Per-session emotion trend (most recent first)
  const trend = [...sessions].reverse().map((s) => ({
    label: s.date,
    template: s.templateName,
    ...s.emotions,
  }));

  // Aggregate indicators
  const indicatorCounts: Record<string, number> = {};
  sessions.forEach((s) => {
    s.indicators.forEach((ind) => {
      indicatorCounts[ind] = (indicatorCounts[ind] ?? 0) + 1;
    });
  });
  const topIndicators = Object.entries(indicatorCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6);

  // Aggregate spike question topics
  const spikeQuestions = sessions.flatMap((s) =>
    s.spikes.map((sp) => ({
      question: s.responses[sp.questionIndex]?.question ?? "Unknown",
      template: s.templateName,
      intensity: sp.intensity,
    }))
  );

  const emotionColors: Record<string, string> = {
    sad: "bg-blue-500",
    happy: "bg-green-500",
    angry: "bg-red-500",
    neutral: "bg-slate-400",
  };

  return (
    <div className="space-y-6 md:space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 md:text-4xl">Reports</h1>
        <p className="mt-1 text-sm text-slate-500">
          Emotional trends, common triggers, and long-term progress across all sessions.
        </p>
      </div>

      {/* Stat Cards */}
      <section className="grid grid-cols-2 gap-3 md:gap-6 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 md:text-sm">Total Sessions</p>
              <h2 className="mt-1 text-2xl font-bold md:mt-2 md:text-3xl">{totalSessions}</h2>
            </div>
            <Activity size={24} className="text-blue-600" />
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 md:text-sm">High Risk Cases</p>
              <h2 className="mt-1 text-2xl font-bold text-red-500 md:mt-2 md:text-3xl">{highRisk}</h2>
            </div>
            <AlertTriangle size={24} className="text-red-500" />
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 md:text-sm">Moderate Risk</p>
              <h2 className="mt-1 text-2xl font-bold text-yellow-500 md:mt-2 md:text-3xl">{moderateRisk}</h2>
            </div>
            <TrendingUp size={24} className="text-yellow-500" />
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 md:text-sm">Total Patients</p>
              <h2 className="mt-1 text-2xl font-bold md:mt-2 md:text-3xl">{patients.length}</h2>
            </div>
            <Users size={24} className="text-blue-600" />
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        {/* Left column */}
        <div className="space-y-6 xl:col-span-2">
          {/* Overall Emotion Distribution */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
            <h2 className="mb-4 text-lg font-semibold md:mb-6 md:text-xl">Overall Emotion Distribution</h2>
            <div className="space-y-4">
              {Object.entries(avgEmotions)
                .sort(([, a], [, b]) => b - a)
                .map(([label, pct]) => (
                  <div key={label}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="capitalize text-slate-700">{label}</span>
                      <span className="text-slate-500">{pct}%</span>
                    </div>
                    <div className="h-3 w-full rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full ${emotionColors[label] ?? "bg-slate-400"} transition-all duration-500`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Session-by-Session Trend */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
            <h2 className="mb-4 text-lg font-semibold md:mb-6 md:text-xl">Session-by-Session Trend</h2>
            {trend.length > 0 ? (
              <div className="space-y-3">
                {trend.map((t, i) => (
                  <div key={i} className="rounded-xl border border-slate-200 p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-medium">{t.template}</span>
                      <span className="text-xs text-slate-400">{t.label}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {Object.entries({ sad: t.sad, happy: t.happy, angry: t.angry, neutral: t.neutral })
                        .sort(([, a], [, b]) => b - a)
                        .map(([label, pct]) => (
                          <div key={label} className="flex flex-1 flex-col items-center gap-1">
                            <div className="h-16 w-full rounded-md bg-slate-100 relative overflow-hidden">
                              <div
                                className={`absolute bottom-0 w-full rounded-md ${emotionColors[label]}`}
                                style={{ height: `${pct}%` }}
                              />
                            </div>
                            <span className="text-[10px] capitalize text-slate-400">{label}</span>
                            <span className="text-xs font-medium text-slate-600">{pct}%</span>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-slate-400">No session data available.</p>
            )}
          </div>

          {/* Common Emotional Spikes */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
            <h2 className="mb-4 text-lg font-semibold md:mb-6 md:text-xl">Common Emotional Spike Topics</h2>
            {spikeQuestions.length > 0 ? (
              <div className="space-y-3">
                {spikeQuestions.map((sq, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 rounded-xl border-l-4 border-yellow-400 bg-yellow-50 p-4"
                  >
                    <AlertTriangle size={16} className="mt-0.5 shrink-0 text-yellow-600" />
                    <div>
                      <p className="text-sm font-medium text-yellow-800">{sq.question}</p>
                      <p className="text-xs text-yellow-600">
                        Template: {sq.template} — Intensity: {sq.intensity}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-slate-400">No emotional spikes recorded.</p>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Common Indicators */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
            <h2 className="mb-4 text-lg font-semibold md:text-xl">Top Indicators</h2>
            {topIndicators.length > 0 ? (
              <div className="space-y-3">
                {topIndicators.map(([label, count]) => (
                  <div key={label} className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
                    <span className="text-sm font-medium text-slate-700">{label}</span>
                    <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-600">
                      {count}x
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-slate-400">No indicators recorded.</p>
            )}
          </div>

          {/* Risk Distribution */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
            <h2 className="mb-4 text-lg font-semibold md:text-xl">Risk Distribution</h2>
            <div className="space-y-3">
              {[
                { label: "High", count: highRisk, color: "bg-red-500", textColor: "text-red-600" },
                { label: "Moderate", count: moderateRisk, color: "bg-yellow-500", textColor: "text-yellow-600" },
                { label: "Low", count: lowRisk, color: "bg-green-500", textColor: "text-green-600" },
              ].map((item) => {
                const max = totalSessions || 1;
                return (
                  <div key={item.label}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="text-slate-700">{item.label}</span>
                      <span className={`font-semibold ${item.textColor}`}>{item.count}</span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full ${item.color}`}
                        style={{ width: `${(item.count / max) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Therapist Summary */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
            <h2 className="mb-4 text-lg font-semibold md:text-xl">Therapist Summary</h2>
            <div className="space-y-3 text-sm leading-relaxed text-slate-600">
              <p>
                Most emotional spikes occur during discussions about <strong>family expectations</strong>,{" "}
                <strong>self-worth</strong>, and <strong>academic performance</strong>.
              </p>
              <p>
                Recent interviews indicate a reduction in anger-related responses but continued
                sadness indicators among moderate-risk patients.
              </p>
              <div className="flex items-center gap-2 text-green-600">
                <TrendingDown size={16} />
                <span className="text-xs font-medium">Sadness trending down from 52% to 45%</span>
              </div>
            </div>
          </div>

          {/* Recent Sessions Quick Links */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
            <h2 className="mb-4 text-lg font-semibold md:text-xl">Recent Sessions</h2>
            <div className="space-y-2">
              {sessions.slice(0, 3).map((s) => (
                <Link
                  key={s.id}
                  to={`/sessions/${s.id}`}
                  className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 transition hover:border-blue-200 hover:bg-blue-50/30"
                >
                  <div>
                    <span className="text-sm font-medium">{s.patientName}</span>
                    <p className="text-xs text-slate-400">{s.templateName} — {s.date}</p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      s.riskLevel === "High"
                        ? "bg-red-50 text-red-600"
                        : s.riskLevel === "Moderate"
                          ? "bg-yellow-50 text-yellow-600"
                          : "bg-green-50 text-green-600"
                    }`}
                  >
                    {s.riskLevel}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
