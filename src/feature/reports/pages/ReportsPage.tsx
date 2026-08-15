import { useMemo } from "react";
import { useSessions } from "../../context/sessions/useSessions";
import { usePatients } from "../../context/patients/usePatients";
import { Link } from "react-router-dom";
import { AlertTriangle, Users, Activity, BarChart3, TrendingUp, TrendingDown, Minus, ArrowRight } from "lucide-react";
import LoadingSpinner from "../../../shared/components/LoadingSpinner";
import EmptyState from "../../../shared/components/EmptyState";

const emotionColors: Record<string, string> = {
  sad: "bg-blue-500",
  happy: "bg-green-500",
  angry: "bg-red-500",
  neutral: "bg-slate-400",
};

const riskBadge: Record<string, string> = {
  High: "bg-red-50 text-red-600",
  Moderate: "bg-yellow-50 text-yellow-600",
  Low: "bg-green-50 text-green-600",
};

export default function ReportsPage() {
  const { sessions, loading: sessionsLoading } = useSessions();
  const { patients, loading: patientsLoading } = usePatients();

  const stats = useMemo(() => {
    if (sessions.length === 0) return null;

    const total = sessions.length;
    const highRisk = sessions.filter((s) => s.riskLevel === "High").length;
    const moderateRisk = sessions.filter((s) => s.riskLevel === "Moderate").length;
    const lowRisk = sessions.filter((s) => s.riskLevel === "Low").length;

    // Average emotions
    const avgEmotions = {
      sad: Math.round(sessions.reduce((sum, s) => sum + s.emotions.sad, 0) / total),
      happy: Math.round(sessions.reduce((sum, s) => sum + s.emotions.happy, 0) / total),
      angry: Math.round(sessions.reduce((sum, s) => sum + s.emotions.angry, 0) / total),
      neutral: Math.round(sessions.reduce((sum, s) => sum + s.emotions.neutral, 0) / total),
    };

    // Top indicators
    const indicatorCounts: Record<string, number> = {};
    sessions.forEach((s) => {
      s.indicators.forEach((ind) => {
        indicatorCounts[ind] = (indicatorCounts[ind] ?? 0) + 1;
      });
    });
    const topIndicators = Object.entries(indicatorCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    // Most common interview topic
    const topicCounts: Record<string, number> = {};
    sessions.forEach((s) => {
      const topic = s.templateName || "Unknown";
      topicCounts[topic] = (topicCounts[topic] ?? 0) + 1;
    });
    const topTopic = Object.entries(topicCounts).sort(([, a], [, b]) => b - a)[0];

    // Dominant emotion overall
    const dominantEmotion = Object.entries(avgEmotions).sort(([, a], [, b]) => b - a)[0];

    // Spike data with session references
    const spikes = sessions.flatMap((s) =>
      s.spikes.map((sp) => ({
        question: s.responses[sp.questionIndex]?.question ?? "Unknown",
        template: s.templateName,
        emotion: sp.emotion,
        intensity: sp.intensity,
        date: s.date,
        sessionId: s.id,
        patientName: s.patientName,
      }))
    );

    // Recent sessions (5 max)
    const recent = [...sessions].reverse().slice(0, 5);

    return {
      total,
      highRisk,
      moderateRisk,
      lowRisk,
      avgEmotions,
      topIndicators,
      topTopic,
      dominantEmotion,
      spikes,
      recent,
    };
  }, [sessions]);

  if (sessionsLoading || patientsLoading) {
    return <LoadingSpinner message="Loading reports..." />;
  }

  if (!stats) {
    return (
      <div className="space-y-6 md:space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 md:text-4xl">Reports</h1>
          <p className="mt-1 text-sm text-slate-500">
            Practice-level AI insights and trends across completed sessions.
          </p>
        </div>
        <EmptyState
          icon={BarChart3}
          title="No session data yet"
          description="Complete your first interview to see AI-generated practice insights and emotional trends."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 md:text-4xl">Reports</h1>
        <p className="mt-1 text-sm text-slate-500">
          Practice-level AI insights and trends across completed sessions.
        </p>
      </div>

      {/* Overall AI Insights */}
      <section className="grid grid-cols-2 gap-3 md:gap-6 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 md:text-sm">Total Sessions</p>
              <h2 className="mt-1 text-2xl font-bold md:mt-2 md:text-3xl">{stats.total}</h2>
            </div>
            <Activity size={24} className="text-blue-600" />
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 md:text-sm">Sessions Requiring Review</p>
              <h2 className="mt-1 text-2xl font-bold text-red-500 md:mt-2 md:text-3xl">{stats.highRisk}</h2>
            </div>
            <AlertTriangle size={24} className="text-red-500" />
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 md:text-sm">Moderate Risk</p>
              <h2 className="mt-1 text-2xl font-bold text-yellow-500 md:mt-2 md:text-3xl">{stats.moderateRisk}</h2>
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
          {/* Detected Emotional Indicators */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
            <h2 className="mb-4 text-lg font-semibold md:mb-6 md:text-xl">Detected Emotional Indicators</h2>
            <div className="space-y-4">
              {Object.entries(stats.avgEmotions)
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

          {/* Emotional Trends Summary */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
            <h2 className="mb-4 text-lg font-semibold md:mb-6 md:text-xl">Emotional Trends</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {/* Dominant emotion */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Dominant Emotion</p>
                <p className="mt-1 text-lg font-bold capitalize text-slate-800">{stats.dominantEmotion[0]}</p>
                <p className="text-xs text-slate-400">{stats.dominantEmotion[1]}% average across all sessions</p>
              </div>

              {/* Most common topic */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Most Common Interview Topic</p>
                <p className="mt-1 text-lg font-bold text-slate-800">{stats.topTopic?.[0] || "N/A"}</p>
                <p className="text-xs text-slate-400">{stats.topTopic?.[1] || 0} sessions</p>
              </div>

              {/* Risk trend */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Risk Distribution</p>
                <div className="mt-1 flex items-center gap-3">
                  <span className="text-sm font-semibold text-red-600">{stats.highRisk} High</span>
                  <span className="text-sm font-semibold text-yellow-600">{stats.moderateRisk} Moderate</span>
                  <span className="text-sm font-semibold text-green-600">{stats.lowRisk} Low</span>
                </div>
              </div>

              {/* Emotional stability */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Overall Pattern</p>
                <div className="mt-1 flex items-center gap-2">
                  {stats.avgEmotions.sad > 40 || stats.avgEmotions.angry > 30 ? (
                    <>
                      <TrendingUp size={16} className="text-amber-500" />
                      <span className="text-sm font-semibold text-amber-700">Elevated negative indicators</span>
                    </>
                  ) : stats.avgEmotions.happy > 50 ? (
                    <>
                      <TrendingDown size={16} className="text-green-500" />
                      <span className="text-sm font-semibold text-green-700">Generally positive indicators</span>
                    </>
                  ) : (
                    <>
                      <Minus size={16} className="text-slate-400" />
                      <span className="text-sm font-semibold text-slate-600">Mixed emotional indicators</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Emotional Spike Analysis */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
            <h2 className="mb-4 text-lg font-semibold md:mb-6 md:text-xl">Emotional Spike Analysis</h2>
            {stats.spikes.length > 0 ? (
              <div className="space-y-3">
                {stats.spikes.map((sp, i) => (
                  <Link
                    key={i}
                    to={`/sessions/${sp.sessionId}`}
                    className="flex items-start gap-3 rounded-xl border-l-4 border-yellow-400 bg-yellow-50 p-4 transition hover:bg-yellow-100"
                  >
                    <AlertTriangle size={16} className="mt-0.5 shrink-0 text-yellow-600" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-yellow-800">{sp.question}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-yellow-600">
                        <span>{sp.patientName}</span>
                        <span>&middot;</span>
                        <span>{sp.template}</span>
                        <span>&middot;</span>
                        <span className="capitalize">{sp.emotion}</span>
                        <span>&middot;</span>
                        <span>Intensity: {sp.intensity}%</span>
                        <span>&middot;</span>
                        <span>{sp.date}</span>
                      </div>
                    </div>
                    <ArrowRight size={14} className="mt-1 shrink-0 text-yellow-400" />
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={AlertTriangle}
                title="No emotional spikes recorded"
                description="Spikes appear when significant emotional changes are detected."
              />
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Top Indicators */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
            <h2 className="mb-4 text-lg font-semibold md:text-xl">Top Emotional Indicators</h2>
            {stats.topIndicators.length > 0 ? (
              <div className="space-y-3">
                {stats.topIndicators.map(([label, count]) => (
                  <div key={label} className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
                    <span className="text-sm font-medium text-slate-700">{label}</span>
                    <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-600">
                      {count}x
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Activity}
                title="No indicators recorded"
                description="Indicators are detected from completed interview sessions."
              />
            )}
          </div>

          {/* Session Risk Distribution */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
            <h2 className="mb-4 text-lg font-semibold md:text-xl">Session Risk Distribution</h2>
            <div className="space-y-3">
              {[
                { label: "High", count: stats.highRisk, color: "bg-red-500", textColor: "text-red-600" },
                { label: "Moderate", count: stats.moderateRisk, color: "bg-yellow-500", textColor: "text-yellow-600" },
                { label: "Low", count: stats.lowRisk, color: "bg-green-500", textColor: "text-green-600" },
              ].map((item) => {
                const max = stats.total || 1;
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

          {/* Recent Sessions */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
            <h2 className="mb-4 text-lg font-semibold md:text-xl">Recent Sessions</h2>
            <div className="space-y-2">
              {stats.recent.map((s) => (
                <Link
                  key={s.id}
                  to={`/sessions/${s.id}`}
                  className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 transition hover:border-blue-200 hover:bg-blue-50/30"
                >
                  <div>
                    <span className="text-sm font-medium">{s.patientName}</span>
                    <p className="text-xs text-slate-400">{s.templateName} — {s.date}</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${riskBadge[s.riskLevel] ?? "bg-slate-100 text-slate-500"}`}>
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
