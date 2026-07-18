import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import { useSessions } from "../../context/sessions/useSessions";
import type { MappedSession, EmotionalSpike } from "../../../shared/types/session";
import { useSessionComputed } from "../hooks/useSessionComputed";
import { usePerQuestionNotes } from "../hooks/usePerQuestionNotes";
import SessionOverviewCard from "../components/SessionOverviewCard";
import EmotionTimelineHeatmap from "../components/EmotionTimelineHeatmap";
import QuestionMiniNav from "../components/QuestionMiniNav";
import SpikeContextPanel from "../components/SpikeContextPanel";
import QuestionCard from "../components/QuestionCard";
import QwenReportSection from "../components/QwenReportSection";

export default function SessionReviewPage() {
  const { id } = useParams();
  const { getSessionById, fetchSessionById, updateNotes } = useSessions();
  const cachedSession = getSessionById(Number(id));
  const [session, setSession] = useState<MappedSession | null>(cachedSession);

  const [notes, setNotes] = useState(session?.notes ?? "");
  const [saved, setSaved] = useState(false);
  const [selectedSpike, setSelectedSpike] = useState<EmotionalSpike | null>(null);

  // Computed data from session
  const computed = useSessionComputed(session);
  const { getNote, updateNote } = usePerQuestionNotes(session?.id);

  // Sync notes when session data arrives
  useEffect(() => {
    if (session) setNotes(session.notes ?? "");
  }, [session]);

  // Fetch full session data if cached version is incomplete
  useEffect(() => {
    if (cachedSession && cachedSession.responses.length > 0) {
      setSession(cachedSession);
      return;
    }
    fetchSessionById(Number(id)).then((full) => {
      if (full) setSession(full);
    });
  }, [id, cachedSession, fetchSessionById]);

  if (!session || !computed) {
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

  const spikeIndices = session.spikes.map((s) => s.question_index);

  // Emotion distribution colors
  const emotionBarColors: Record<string, string> = {
    sad: "bg-blue-500",
    happy: "bg-green-500",
    angry: "bg-red-500",
    neutral: "bg-slate-400",
  };

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Back link + header */}
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

      {/* 1. Session Overview */}
      <SessionOverviewCard data={computed.overview} />

      {/* 2. Timeline + Question Navigation */}
      <div className="relative">
        <EmotionTimelineHeatmap
          points={session.responses.map((r, i) => ({
            questionIndex: i,
            emotion: (r.emotion || "neutral").charAt(0).toUpperCase() + (r.emotion || "neutral").slice(1),
            confidence: (r.emotionPct || 0) / 100,
            isSpike: session.spikes.some((s) => s.question_index === i),
          }))}
          onSpikeClick={(index) => {
            const spike = session.spikes.find((s) => s.question_index === index);
            if (spike) setSelectedSpike(spike);
          }}
        />
        <QuestionMiniNav questionCount={session.responses.length} spikeIndices={spikeIndices} />
      </div>

      {/* 3. Spike Context (if selected) */}
      {selectedSpike && (
        <SpikeContextPanel
          spike={selectedSpike}
          transcript={session.responses}
          onClose={() => setSelectedSpike(null)}
        />
      )}

      {/* 4. Per-question cards */}
      <div className="space-y-4">
        {computed.perQuestion.map((q) => (
          <QuestionCard
            key={q.index}
            data={q}
            note={getNote(q.index)}
            onNoteChange={updateNote}
          />
        ))}
      </div>

      {/* 5. AI Session Summary */}
      <QwenReportSection report={(session as any).report ?? null} />

      {/* 6. Emotion Distribution */}
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
                    className={`h-full rounded-full ${emotionBarColors[label] ?? "bg-slate-400"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* 7. Detected Indicators */}
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

      {/* 8. Emotional Event Report */}
      {session.emotionalEvents && session.emotionalEvents.length > 0 && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50/30 p-4 shadow-sm md:p-6">
          <h2 className="mb-4 text-lg font-semibold text-blue-900 md:text-xl">Emotional Event Report</h2>
          <p className="mb-4 text-xs text-slate-500 italic">
            This report identifies moments during the interview where notable emotional responses were detected.
            All observations are generated by AI analysis and should be interpreted by a qualified professional.
          </p>
          <div className="space-y-4">
            {session.emotionalEvents.map((event) => {
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
                <div key={event.event_number} className={`rounded-xl border-l-4 p-4 ${intensityColor}`}>
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-800">Emotional Event #{event.event_number}</h3>
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
                    <div>
                      <p className="mb-0.5 text-xs font-medium text-slate-500">Speech Indicators</p>
                      <p className="text-xs text-slate-600">{event.speech_indicators}</p>
                    </div>
                    <div>
                      <p className="mb-0.5 text-xs font-medium text-slate-500">Facial Indicators</p>
                      <p className="text-xs text-slate-600">{event.facial_indicators}</p>
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

      {/* 9. Session-level Therapist Notes */}
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
  );
}
