import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AlertTriangle, Download, Brain, Mic, Eye } from "lucide-react";
import { emotionApi, type EmotionResult } from "../../../shared/api/emotionApi";
import EmotionTimelineHeatmap from "../../sessionReview/components/EmotionTimelineHeatmap";
import SpikeContextPanel from "../../sessionReview/components/SpikeContextPanel";
import EvidencePanel from "../../sessionReview/components/EvidencePanel";

export default function ResultsPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState<EmotionResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedSpike, setSelectedSpike] = useState<any>(null);

  useEffect(() => {
    if (!token) return;

    // Check sessionStorage first (from ProcessingPage)
    const stored = sessionStorage.getItem(`amumata_analysis_${token}`);
    if (stored) {
      try {
        setAnalysis(JSON.parse(stored));
        setLoading(false);
        return;
      } catch {
        // Fall through to API call
      }
    }

    // Fallback: fetch from API
    emotionApi
      .getResults(token)
      .then((result) => {
        // Adapt API response to EmotionResult shape
        setAnalysis({
          session_id: result.session_id,
          risk_level: result.risk_level,
          distribution: result.distribution,
          indicators: result.indicators,
          spikes: result.spikes,
          per_question: result.transcript.map((t, i) => ({
            question_index: i,
            fer: t.fer_emotion ? { emotion: t.fer_emotion, confidence: 0, probabilities: t.fer_probabilities || {}, facial_details: t.facial_details } : null,
            ser: t.ser_emotion ? { emotion: t.ser_emotion, confidence: 0, probabilities: t.ser_probabilities || {}, audio_details: t.audio_details } : null,
            combined_emotion: t.combined_emotion,
            transcript_text: t.answer,
            text_analysis: t.text_analysis,
          })),
          total_questions: result.transcript.length,
          emotional_events: result.emotional_events,
          session_highlights: result.session_highlights,
        });
      })
      .catch((err) => setError(err.message || "Failed to load results"))
      .finally(() => setLoading(false));
  }, [token]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case "High":
        return "text-red-600 bg-red-100";
      case "Moderate":
        return "text-amber-600 bg-amber-100";
      default:
        return "text-green-600 bg-green-100";
    }
  };

  const getEmotionColor = (emotion: string) => {
    switch (emotion.toLowerCase()) {
      case "happy":
        return "bg-green-500";
      case "sad":
        return "bg-blue-500";
      case "angry":
        return "bg-red-500";
      case "neutral":
        return "bg-slate-400";
      default:
        return "bg-slate-300";
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F1F5F9]">
        <p className="text-slate-500">Loading results...</p>
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F1F5F9] px-4">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error || "No results found"}</p>
          <button
            onClick={() => navigate("/")}
            className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const distribution = analysis.distribution || {};
  const spikes = analysis.spikes || [];
  const indicators = analysis.indicators || [];

  // Get interview metadata from sessionStorage
  const metaJson = sessionStorage.getItem(`amumata_result_${token}`);
  const meta = metaJson ? JSON.parse(metaJson) : null;

  // Build transcript for SpikeContextPanel (from per_question data)
  const transcriptForContext = analysis.per_question.map((q) => ({
    question: `Question ${q.question_index + 1}`,
    answer: q.transcript_text || "[Audio response recorded]",
    combined_emotion: q.combined_emotion,
    fer_emotion: q.fer?.emotion || null,
    ser_emotion: q.ser?.emotion || null,
    fer_confidence: q.fer?.confidence || 0,
    ser_confidence: q.ser?.confidence || 0,
    frame_image: null,
  }));

  return (
    <div className="min-h-screen bg-[#F1F5F9] px-4 py-8">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Pre-Evaluation Results</h1>
          {meta && (
            <p className="mt-1 text-sm text-slate-500">
              {meta.patientName} — {meta.templateName} — Duration: {formatTime(meta.duration)}
            </p>
          )}
        </div>

        {/* Risk Level */}
        <div className="mb-6 rounded-2xl bg-white p-6 shadow-md border border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900 mb-3">Risk Assessment</h2>
          <div className="flex items-center gap-4">
            <span
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${getRiskColor(analysis.risk_level)}`}
            >
              {analysis.risk_level === "High" && <AlertTriangle size={16} />}
              {analysis.risk_level} Risk
            </span>
          </div>
          {indicators.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium text-slate-700 mb-2">Indicators:</p>
              <div className="flex flex-wrap gap-2">
                {indicators.map((ind, i) => (
                  <span key={i} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                    {ind}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Emotion Distribution */}
        <div className="mb-6 rounded-2xl bg-white p-6 shadow-md border border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Emotion Distribution</h2>
          <div className="space-y-3">
            {Object.entries(distribution)
              .sort(([, a], [, b]) => b - a)
              .map(([emotion, pct]) => (
                <div key={emotion} className="flex items-center gap-3">
                  <span className="w-16 text-sm font-medium text-slate-700 capitalize">{emotion}</span>
                  <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${getEmotionColor(emotion)}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-12 text-right text-sm text-slate-500">{pct}%</span>
                </div>
              ))}
          </div>
        </div>

        {/* Emotion Timeline Heatmap */}
        <div className="mb-6">
          <EmotionTimelineHeatmap
            points={analysis.per_question.map((q) => ({
              questionIndex: q.question_index,
              emotion: q.combined_emotion,
              confidence: Math.max(q.fer?.confidence || 0, q.ser?.confidence || 0),
              isSpike: spikes.some((s) => s.question_index === q.question_index),
            }))}
            onSpikeClick={(index) => {
              const spike = spikes.find((s) => s.question_index === index);
              if (spike) setSelectedSpike(spike);
            }}
          />
        </div>

        {/* Emotional Spikes */}
        {spikes.length > 0 && (
          <div className="mb-6 rounded-2xl bg-white p-6 shadow-md border border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Emotional Spikes</h2>
            {selectedSpike ? (
              <SpikeContextPanel
                spike={selectedSpike}
                transcript={transcriptForContext}
                onClose={() => setSelectedSpike(null)}
              />
            ) : (
              <div className="space-y-3">
                {spikes.map((spike, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedSpike(spike)}
                    className="w-full flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-left transition hover:bg-amber-100"
                  >
                    <AlertTriangle size={18} className="text-amber-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-slate-900">{spike.label}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        Question {spike.question_index + 1} — Emotion: {spike.emotion} — Intensity: {spike.intensity}%
                      </p>
                      <p className="mt-1 text-[10px] text-amber-500">Click to view surrounding context</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Per-Question Breakdown */}
        {analysis.per_question.length > 0 && (
          <div className="mb-6 rounded-2xl bg-white p-6 shadow-md border border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Question-by-Question Analysis</h2>
            <div className="space-y-4">
              {analysis.per_question.map((q, i) => {
                const isSpike = spikes.some((s) => s.question_index === q.question_index);
                return (
                  <div key={i} className={`rounded-lg border p-4 ${isSpike ? "border-amber-200 bg-amber-50/50" : "border-slate-100"}`}>
                    <div className="flex items-center gap-4">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600 flex-shrink-0">
                        {q.question_index + 1}
                      </span>
                      <div className="flex-1">
                        {q.fer && (
                          <span className="text-xs text-slate-500 mr-3">
                            FER: <strong className="text-slate-700">{q.fer.emotion}</strong> ({Math.round(q.fer.confidence * 100)}%)
                          </span>
                        )}
                        {q.ser && (
                          <span className="text-xs text-slate-500 mr-3">
                            SER: <strong className="text-slate-700">{q.ser.emotion}</strong> ({Math.round(q.ser.confidence * 100)}%)
                          </span>
                        )}
                        {q.transcript_text && (
                          <p className="mt-1 text-xs italic text-slate-400">"{q.transcript_text}"</p>
                        )}
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${getRiskColor(
                          q.combined_emotion === "Sad" || q.combined_emotion === "Angry" ? "High" : "Low"
                        )}`}
                      >
                        {q.combined_emotion}
                      </span>
                    </div>

                    {/* Evidence Panel for spike questions */}
                    {(isSpike || q.fer?.facial_details || q.ser?.audio_details || q.text_analysis) && (
                      <div className="mt-3">
                        <EvidencePanel
                          questionIndex={q.question_index}
                          frame_image={null}
                          facial_details={q.fer?.facial_details}
                          audio_details={q.ser?.audio_details}
                          text_analysis={q.text_analysis}
                          fer_confidence={q.fer?.confidence}
                          ser_confidence={q.ser?.confidence}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Emotional Event Report */}
        {analysis.emotional_events && analysis.emotional_events.length > 0 && (
          <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50/30 p-6 shadow-md">
            <div className="mb-4 flex items-center gap-2">
              <Brain size={20} className="text-blue-600" />
              <h2 className="text-lg font-semibold text-blue-900">Emotional Event Report</h2>
            </div>
            <p className="mb-4 text-xs text-slate-500 italic">
              This report identifies moments during the interview where notable emotional responses were detected.
              All observations are generated by AI analysis and should be interpreted by a qualified professional.
            </p>

            <div className="space-y-4">
              {analysis.emotional_events.map((event: any) => {
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
            {analysis.session_highlights && (
              <div className="mt-6 rounded-xl border border-blue-200 bg-white p-4">
                <h3 className="mb-3 text-sm font-semibold text-blue-800">Session Emotional Highlights</h3>
                <div className="grid gap-3 text-sm md:grid-cols-2">
                  <div>
                    <p className="text-xs text-slate-500">Total Emotional Events Detected</p>
                    <p className="font-semibold text-slate-800">{analysis.session_highlights.total_events}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Most Frequent Emotion</p>
                    <p className="font-semibold text-slate-800">{analysis.session_highlights.most_frequent_emotion}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Highest Intensity Event</p>
                    <p className="font-semibold text-slate-800">
                      {analysis.session_highlights.highest_intensity_event
                        ? `Event #${analysis.session_highlights.highest_intensity_event}`
                        : "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Questions With Emotional Responses</p>
                    <p className="font-semibold text-slate-800">
                      {analysis.session_highlights.questions_with_responses?.join(", ") || "None"}
                    </p>
                  </div>
                </div>
                <div className="mt-3 rounded-lg bg-blue-50 p-3">
                  <p className="text-xs font-medium text-blue-700">Overall Summary</p>
                  <p className="mt-1 text-xs leading-relaxed text-blue-800">
                    {analysis.session_highlights.overall_summary}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Disclaimer */}
        <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 p-4">
          <p className="text-xs text-blue-800">
            <strong>Disclaimer:</strong> This is an AI-assisted emotional pre-evaluation, not a clinical diagnosis.
            Results should be reviewed by a licensed mental health professional. This tool is intended to support
            — not replace — professional judgment.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => navigate("/")}
            className="flex-1 rounded-xl bg-slate-600 px-6 py-3 text-sm font-medium text-white hover:bg-slate-700 transition"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}
