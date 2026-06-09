import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Clock, AlertTriangle, Save, User, Brain, Activity, Eye, Mic } from "lucide-react";
import { useSessions } from "../../context/sessions/useSessions";
import SpikeContextPanel from "../components/SpikeContextPanel";
import EmotionTimelineHeatmap from "../components/EmotionTimelineHeatmap";
import EvidencePanel from "../components/EvidencePanel";

export default function SessionReviewPage() {
  const { id } = useParams();
  const { getSessionById, fetchSessionById, updateNotes } = useSessions();
  const cachedSession = getSessionById(Number(id));
  const [session, setSession] = useState(cachedSession);

  const [notes, setNotes] = useState(session?.notes ?? "");
  const [saved, setSaved] = useState(false);
  const [selectedSpike, setSelectedSpike] = useState<any>(null);

  // Sync notes when session data arrives
  useEffect(() => {
    if (session) setNotes(session.notes ?? "");
  }, [session]);

  // Fetch full session data (with transcript) if the cached version is incomplete
  useEffect(() => {
    if (cachedSession && cachedSession.responses.length > 0) {
      setSession(cachedSession);
      return;
    }
    fetchSessionById(Number(id)).then((full) => {
      if (full) setSession(full);
    });
  }, [id, cachedSession, fetchSessionById]);

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
        {/* Left: Timeline + Spikes + Transcript */}
        <div className="space-y-6 xl:col-span-2">
          {/* Emotion Timeline Heatmap */}
          <EmotionTimelineHeatmap
            points={session.responses.map((r: any, i: number) => ({
              questionIndex: i,
              emotion: r.emotion.charAt(0).toUpperCase() + r.emotion.slice(1),
              confidence: r.emotionPct / 100,
              isSpike: session.spikes.some((s: any) => s.questionIndex === i),
            }))}
            onSpikeClick={(index) => {
              const spike = session.spikes.find((s: any) => s.questionIndex === index);
              if (spike) setSelectedSpike(spike);
            }}
          />

          {/* Emotional Spikes */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
            <h2 className="mb-4 text-lg font-semibold md:text-xl">Emotional Spikes</h2>
            {selectedSpike ? (
              <SpikeContextPanel
                spike={selectedSpike}
                transcript={session.responses}
                onClose={() => setSelectedSpike(null)}
              />
            ) : (
              <div className="space-y-3">
                {session.spikes.length === 0 ? (
                  <p className="text-sm text-slate-400 italic">No emotional spikes detected.</p>
                ) : (
                  session.spikes.map((spike: any) => (
                    <button
                      key={spike.questionIndex}
                      onClick={() => setSelectedSpike(spike)}
                      className="w-full flex items-start gap-3 rounded-xl border-l-4 border-yellow-400 bg-yellow-50 p-4 text-left transition hover:bg-yellow-100"
                    >
                      <AlertTriangle size={18} className="mt-0.5 shrink-0 text-yellow-600" />
                      <div>
                        <p className="text-sm font-medium text-yellow-800">{spike.label}</p>
                        <p className="text-xs text-yellow-600">
                          Q{spike.questionIndex + 1} — Emotion: {spike.emotion} — Intensity: {spike.intensity}%
                        </p>
                        <p className="mt-1 text-[10px] text-yellow-500">Click to view surrounding context</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Transcript */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
            <h2 className="mb-4 text-lg font-semibold md:text-xl">Interview Transcript</h2>
            <div className="space-y-4">
              {session.responses.map((r: any, i: number) => {
                const isSpike = session.spikes.some((s: any) => s.questionIndex === i);
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

                    {/* Evidence Panel — show for spike questions or when enriched data exists */}
                    {(isSpike || r.facial_details || r.audio_details || r.text_analysis) && (
                      <div className="mt-3">
                        <EvidencePanel
                          questionIndex={i}
                          frame_image={r.frame_image}
                          facial_details={r.facial_details}
                          audio_details={r.audio_details}
                          text_analysis={r.text_analysis}
                          fer_confidence={r.fer_confidence}
                          ser_confidence={r.ser_confidence}
                        />
                      </div>
                    )}
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
                .sort(([, a], [, b]) => (b as number) - (a as number))
                .map(([label, pct]) => (
                  <div key={label}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="capitalize text-slate-700">{label}</span>
                      <span className="text-slate-500">{pct as number}%</span>
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
              {session.indicators.map((ind: string) => (
                <span key={ind} className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                  {ind}
                </span>
              ))}
            </div>
          </div>

          {/* Emotional Event Report */}
          {session.emotionalEvents && session.emotionalEvents.length > 0 && (
            <div className="rounded-2xl border border-blue-200 bg-blue-50/30 p-4 shadow-sm md:p-6">
              <div className="mb-4 flex items-center gap-2">
                <Brain size={20} className="text-blue-600" />
                <h2 className="text-lg font-semibold text-blue-900 md:text-xl">Emotional Event Report</h2>
              </div>
              <p className="mb-4 text-xs text-slate-500 italic">
                This report identifies moments during the interview where notable emotional responses were detected.
                All observations are generated by AI analysis and should be interpreted by a qualified professional.
              </p>

              <div className="space-y-4">
                {session.emotionalEvents.map((event: any) => {
                  const intensityColor =
                    event.intensity_level === "High"
                      ? "border-red-300 bg-red-50"
                      : event.intensity_level === "Moderate"
                        ? "border-yellow-300 bg-yellow-50"
                        : "border-slate-200 bg-white";

                  const emotionBadge =
                    event.dominant_emotion === "Sad"
                      ? "bg-blue-100 text-blue-700"
                      : event.dominant_emotion === "Angry"
                        ? "bg-red-100 text-red-700"
                        : event.dominant_emotion === "Happy"
                          ? "bg-green-100 text-green-700"
                          : "bg-slate-100 text-slate-700";

                  return (
                    <div
                      key={event.event_number}
                      className={`rounded-xl border-l-4 p-4 ${intensityColor}`}
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-slate-800">
                          Emotional Event #{event.event_number}
                        </h3>
                        <div className="flex items-center gap-2">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${emotionBadge}`}>
                            {event.dominant_emotion}
                          </span>
                          <span className="text-xs text-slate-500">{event.emotion_confidence}%</span>
                        </div>
                      </div>

                      <div className="mb-3 grid gap-3 text-sm md:grid-cols-2">
                        <div>
                          <p className="mb-1 text-xs font-medium text-slate-500">Time</p>
                          <p className="text-slate-700">{event.timestamp}</p>
                        </div>
                        <div>
                          <p className="mb-1 text-xs font-medium text-slate-500">Intensity Level</p>
                          <p className={`font-medium ${
                            event.intensity_level === "High"
                              ? "text-red-600"
                              : event.intensity_level === "Moderate"
                                ? "text-yellow-600"
                                : "text-slate-600"
                          }`}>
                            {event.intensity_level}
                          </p>
                        </div>
                      </div>

                      <div className="mb-3">
                        <p className="mb-1 text-xs font-medium text-slate-500">Question</p>
                        <p className="text-sm text-slate-700">{event.question}</p>
                      </div>

                      <div className="mb-3">
                        <p className="mb-1 text-xs font-medium text-slate-500">Transcript</p>
                        <p className="text-sm italic text-slate-600">"{event.transcript}"</p>
                      </div>

                      <div className="mb-3 grid gap-3 md:grid-cols-2">
                        <div className="flex items-start gap-2">
                          <Mic size={14} className="mt-0.5 shrink-0 text-purple-500" />
                          <div>
                            <p className="mb-0.5 text-xs font-medium text-slate-500">Speech Indicators</p>
                            <p className="text-xs text-slate-600">{event.speech_indicators}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <Eye size={14} className="mt-0.5 shrink-0 text-indigo-500" />
                          <div>
                            <p className="mb-0.5 text-xs font-medium text-slate-500">Facial Indicators</p>
                            <p className="text-xs text-slate-600">{event.facial_indicators}</p>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-lg bg-slate-50 p-3">
                        <p className="mb-1 text-xs font-medium text-slate-500">Summary</p>
                        <p className="text-xs leading-relaxed text-slate-600">{event.summary}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Session Highlights */}
              {session.sessionHighlights && (
                <div className="mt-6 rounded-xl border border-blue-200 bg-white p-4">
                  <h3 className="mb-3 text-sm font-semibold text-blue-800">Session Emotional Highlights</h3>
                  <div className="grid gap-3 text-sm md:grid-cols-2">
                    <div>
                      <p className="text-xs text-slate-500">Total Emotional Events Detected</p>
                      <p className="font-semibold text-slate-800">{session.sessionHighlights.total_events}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Most Frequent Emotion</p>
                      <p className="font-semibold text-slate-800">{session.sessionHighlights.most_frequent_emotion}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Highest Intensity Event</p>
                      <p className="font-semibold text-slate-800">
                        {session.sessionHighlights.highest_intensity_event
                          ? `Event #${session.sessionHighlights.highest_intensity_event}`
                          : "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Questions With Emotional Responses</p>
                      <p className="font-semibold text-slate-800">
                        {session.sessionHighlights.questions_with_responses?.join(", ") || "None"}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 rounded-lg bg-blue-50 p-3">
                    <p className="text-xs font-medium text-blue-700">Overall Summary</p>
                    <p className="mt-1 text-xs leading-relaxed text-blue-800">
                      {session.sessionHighlights.overall_summary}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

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
