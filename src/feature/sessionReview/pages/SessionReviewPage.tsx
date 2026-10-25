/**
 * SESSION REVIEW PAGE
 *
 * Purpose:
 * Main therapist view for inspecting a completed pre-evaluation session.
 * Displays per-question FER/SER/LER evidence, fusion results, emotional
 * events, AI session summary, and therapist notes.
 *
 * Data source:
 * Backend session API (GET /api/sessions/:id)
 *   → SessionsProvider (fetch + mapSession)
 *   → useSessionComputed (derived data)
 *   → THIS COMPONENT
 *
 * Child components:
 * - SessionOverviewCard — overall emotion, risk, agreement
 * - EmotionTimelineHeatmap — per-question timeline
 * - QuestionCard — per-question transcript + AI evidence
 * - AiReportSection — LLM-generated session summary
 * - SpikeContextPanel — spike context viewer
 *
 * Related backend:
 * - src/modules/sessions/infrastructure/SessionRepo.js → findById()
 * - src/modules/emotion_analysis/application/EmotionAnalysisService.js → creates sessions
 */
import { useState, useEffect, useCallback } from "react";
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
import EvidenceQualityCard from "../components/EvidenceQualityCard";
import QuestionCard from "../components/QuestionCard";
import AiReportSection from "../components/AiReportSection";
import SessionFollowUpCard from "../components/SessionFollowUpCard";
import LoadingSpinner from "../../../shared/components/LoadingSpinner";
import { useToast } from "../../../shared/context/ToastContext";

export default function SessionReviewPage() {
  const { id } = useParams();
  const { getSessionById, fetchSessionById, updateNotes, regenerateReport, loading } = useSessions();
  const { success: showSuccess } = useToast();
  const cachedSession = getSessionById(Number(id));
  const [session, setSession] = useState<MappedSession | null>(cachedSession);
  const [fetching, setFetching] = useState(false);

  const [notes, setNotes] = useState(session?.notes ?? "");
  const [saved, setSaved] = useState(false);
  const [selectedSpike, setSelectedSpike] = useState<EmotionalSpike | null>(null);

  // Computed data from session
  const computed = useSessionComputed(session);
  const { getNote, updateNote } = usePerQuestionNotes(session?.id);

  const handleRegenerateReport = useCallback(async () => {
    if (!session?.id) return;
    const newReport = await regenerateReport(session.id);
    setSession((prev) => (prev ? { ...prev, report: newReport } : prev));
    showSuccess("AI report regenerated");
  }, [session?.id, regenerateReport, showSuccess]);

  // Sync notes when session data arrives
  useEffect(() => {
    if (session) setNotes(session.notes ?? "");
  }, [session]);

  // Always fetch fresh session data from the detail endpoint.
  // The list endpoint omits `report` and other large fields,
  // so the cached session is incomplete. Use it only as an
  // optimistic initial display to avoid a blank loading screen.
  useEffect(() => {
    if (cachedSession) {
      setSession(cachedSession);
    }
    let cancelled = false;
    setFetching(true);
    fetchSessionById(Number(id)).then((full) => {
      if (full && !cancelled) setSession(full);
    }).finally(() => {
      if (!cancelled) setFetching(false);
    });
    return () => { cancelled = true; };
  }, [id, fetchSessionById]);

  if (loading || fetching) {
    return <LoadingSpinner message="Loading session data..." />;
  }

  if (!session || !computed) {
    return (
      <div className="space-y-4">
        <Link to="/patients" className="inline-flex items-center gap-2 text-sm text-teal-600 hover:underline">
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
    showSuccess("Therapist notes saved successfully.");
    setTimeout(() => setSaved(false), 2000);
  };

  const spikeIndices = session.spikes.map((s) => s.questionIndex);

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
          className="mb-2 inline-flex items-center gap-2 text-sm text-teal-600 hover:underline"
        >
          <ArrowLeft size={16} />
          Back to Patient
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">Session Review</h1>
        <p className="mt-1 text-sm text-slate-500">
          {session.patientName} — {session.templateName} — {session.date}
        </p>
      </div>

      {/* 1. Session Overview */}
      <SessionOverviewCard data={computed.overview} />

      {/* 2. Timeline + Question Navigation */}
      <div className="relative">
        <EmotionTimelineHeatmap
          points={session.responses.map((r, i) => {
            const spike = session.spikes.find((s) => s.questionIndex === i);
            return {
              questionIndex: i,
              emotion: (r.emotion || "neutral").charAt(0).toUpperCase() + (r.emotion || "neutral").slice(1),
              confidence: (r.emotionPct || 0) / 100,
              isSpike: !!spike,
              spikeType: spike?.type,
              spikeLabel: spike?.label,
            };
          })}
          onSpikeClick={(index) => {
            const spike = session.spikes.find((s) => s.questionIndex === index);
            if (spike) {
              setSelectedSpike({
                question_index: spike.questionIndex,
                label: spike.label,
                emotion: spike.emotion as EmotionalSpike["emotion"],
                intensity: spike.intensity,
                type: spike.type,
              });
            }
          }}
        />
        <QuestionMiniNav questionCount={session.responses.length} spikeIndices={spikeIndices} />
      </div>

      {/* 3. Evidence Quality & Modality Coverage */}
      <EvidenceQualityCard responses={session.responses} />

      {/* 4. Spike Context (if selected) */}
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
      {/* ============================================================ */}
      {/* NOTE: reportStatus is derived in useSessionComputed.ts as:    */}
      {/*   hasReport ? "available" : "unavailable"                     */}
      {/*                                                               */}
      {/* If this shows "unavailable" but the backend generated a       */}
      {/* report (including fallback), the issue is:                    */}
      {/* 1. Report not persisted to DB (check migration)               */}
      {/* 2. Report not returned by API (check SessionRepo.findById)    */}
      {/* 3. Report lost in mapSession (check SessionsProvider.tsx)     */}
      {/*                                                               */}
      {/* The Python report_generator.py ALWAYS returns a dict          */}
      {/* (either Ollama or fallback). So mlResult.report should        */}
      {/* never be null. If it is, the Express→DB handoff failed.       */}
      {/* ============================================================ */}
      <AiReportSection report={session.report ?? null} reportStatus={computed?.overview.reportStatus} onRegenerate={handleRegenerateReport} />

      {/* 6. Emotion Distribution */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <h2 className="mb-4 text-base font-semibold text-slate-900">Emotion Distribution</h2>
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
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <h2 className="mb-3 text-base font-semibold text-slate-900">Detected Indicators</h2>
        <div className="flex flex-wrap gap-2">
          {session.indicators.map((ind: string) => (
            <span key={ind} className="rounded-full bg-teal-50 px-3 py-1 text-xs font-medium text-teal-700">
              {ind}
            </span>
          ))}
        </div>
      </div>

      {/* 8. Emotional Event Report */}
      {session.emotionalEvents && session.emotionalEvents.length > 0 && (
        <div className="rounded-xl border border-teal-200 bg-teal-50/30 p-5 shadow-sm md:p-6">
          <h2 className="mb-4 text-base font-semibold text-teal-900">Emotional Event Report</h2>
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
            <div className="mt-6 rounded-lg border border-teal-200 bg-white p-4">
              <h3 className="mb-3 text-sm font-semibold text-teal-800">Session Emotional Highlights</h3>
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
              <div className="mt-3 rounded-lg bg-teal-50 p-3">
                <p className="text-xs font-medium text-teal-700">Overall Summary</p>
                <p className="mt-1 text-xs leading-relaxed text-teal-800">
                  {session.sessionHighlights.overall_summary}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 9. Follow-up Recommendation — advise patient to come back */}
      <SessionFollowUpCard sessionId={session.id} patientId={session.patientId} />

      {/* 10. Session-level Therapist Notes */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">Therapist Notes</h2>
          <button
            onClick={handleSaveNotes}
            className="flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-teal-700"
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
          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 resize-none"
        />
      </div>
    </div>
  );
}
