import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Clock, AlertTriangle, Save, User } from "lucide-react";
import { useSessions } from "../../context/sessions/useSessions";

export default function SessionReviewPage() {
  const { id } = useParams();
  const { getSessionById, updateNotes } = useSessions();
  const session = getSessionById(Number(id));

  const [notes, setNotes] = useState(session?.notes ?? "");
  const [saved, setSaved] = useState(false);

  if (!session) {
    return (
      <div className="space-y-4">
        <Link to="/patients" className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline">
          <ArrowLeft size={16} />
          Back to Patients
        </Link>
        <p className="text-slate-500">Session not found.</p>
      </div>
    );
  }

  const handleSaveNotes = () => {
    updateNotes(session.id, notes);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const riskColor =
    session.riskLevel === "High"
      ? "bg-red-50 text-red-700 border-red-200"
      : session.riskLevel === "Moderate"
        ? "bg-yellow-50 text-yellow-700 border-yellow-200"
        : "bg-green-50 text-green-700 border-green-200";

  const emotionColors: Record<string, string> = {
    sad: "bg-blue-500",
    happy: "bg-green-500",
    angry: "bg-red-500",
    neutral: "bg-slate-400",
  };

  const emotionBadgeColors: Record<string, string> = {
    sad: "bg-blue-50 text-blue-600",
    happy: "bg-green-50 text-green-600",
    angry: "bg-red-50 text-red-600",
    neutral: "bg-slate-100 text-slate-600",
  };

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Header */}
      <div>
        <Link
          to={`/patients/${session.patientId}`}
          className="mb-2 inline-flex items-center gap-2 text-sm text-blue-600 hover:underline"
        >
          <ArrowLeft size={16} />
          Back to Patient
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 md:text-4xl">Session Review</h1>
        <p className="mt-1 text-sm text-slate-500">
          {session.patientName} — {session.templateName} — {session.date}
        </p>
      </div>

      {/* Summary Cards */}
      <section className="grid grid-cols-2 gap-3 md:gap-6 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
          <p className="text-xs text-slate-500 md:text-sm">Date</p>
          <h3 className="mt-1 text-lg font-semibold md:mt-2 md:text-xl">{session.date}</h3>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
          <p className="text-xs text-slate-500 md:text-sm">Duration</p>
          <div className="mt-1 flex items-center gap-2 md:mt-2">
            <Clock size={16} className="text-slate-400" />
            <h3 className="text-lg font-semibold md:text-xl">{session.duration}</h3>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
          <p className="text-xs text-slate-500 md:text-sm">Risk Level</p>
          <div className="mt-1 md:mt-2">
            <span className={`inline-block rounded-full border px-3 py-1 text-xs font-semibold ${riskColor}`}>
              {session.riskLevel}
            </span>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
          <p className="text-xs text-slate-500 md:text-sm">Questions</p>
          <h3 className="mt-1 text-lg font-semibold md:mt-2 md:text-xl">{session.responses.length}</h3>
        </div>
      </section>

      {/* Two-column layout */}
      <section className="grid gap-6 xl:grid-cols-3">
        {/* Left: Transcript + Spikes */}
        <div className="space-y-6 xl:col-span-2">
          {/* Emotional Spikes */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
            <h2 className="mb-4 text-lg font-semibold md:text-xl">Emotional Spikes</h2>
            <div className="space-y-3">
              {session.spikes.map((spike) => (
                <div
                  key={spike.questionIndex}
                  className="flex items-start gap-3 rounded-xl border-l-4 border-yellow-400 bg-yellow-50 p-4"
                >
                  <AlertTriangle size={18} className="mt-0.5 shrink-0 text-yellow-600" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800">{spike.label}</p>
                    <p className="text-xs text-yellow-600">
                      Q{spike.questionIndex + 1} — Emotion: {spike.emotion} — Intensity: {spike.intensity}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Transcript */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
            <h2 className="mb-4 text-lg font-semibold md:text-xl">Interview Transcript</h2>
            <div className="space-y-4">
              {session.responses.map((r, i) => {
                const isSpike = session.spikes.some((s) => s.questionIndex === i);
                return (
                  <div
                    key={i}
                    className={`rounded-xl border p-4 ${
                      isSpike ? "border-yellow-300 bg-yellow-50/50" : "border-slate-200"
                    }`}
                  >
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <p className="text-sm font-medium text-blue-700">Q{i + 1}: {r.question}</p>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${emotionBadgeColors[r.emotion] ?? "bg-slate-100 text-slate-600"}`}>
                        {r.emotion} {r.emotionPct}%
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <User size={14} className="mt-0.5 shrink-0 text-slate-400" />
                      <p className="text-sm leading-relaxed text-slate-600 italic">{r.answer}</p>
                    </div>
                    {/* Emotion bar */}
                    <div className="mt-3 flex items-center gap-3">
                      <span className="w-16 text-xs text-slate-400">Intensity</span>
                      <div className="h-2 flex-1 rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${emotionColors[r.emotion] ?? "bg-slate-400"}`}
                          style={{ width: `${r.emotionPct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Emotion Summary + Notes */}
        <div className="space-y-6">
          {/* Emotion Distribution */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
            <h2 className="mb-4 text-lg font-semibold md:text-xl">Emotion Distribution</h2>
            <div className="space-y-3">
              {Object.entries(session.emotions)
                .sort(([, a], [, b]) => b - a)
                .map(([label, pct]) => (
                  <div key={label}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="capitalize text-slate-700">{label}</span>
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
          </div>

          {/* Indicators */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
            <h2 className="mb-3 text-lg font-semibold md:text-xl">Detected Indicators</h2>
            <div className="flex flex-wrap gap-2">
              {session.indicators.map((ind) => (
                <span key={ind} className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                  {ind}
                </span>
              ))}
            </div>
          </div>

          {/* Therapist Notes */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold md:text-xl">Therapist Notes</h2>
              <button
                onClick={handleSaveNotes}
                className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-blue-700"
              >
                <Save size={12} />
                {saved ? "Saved!" : "Save"}
              </button>
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add your clinical notes here..."
              rows={6}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
