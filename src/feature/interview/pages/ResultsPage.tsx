import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Heart, Shield, Users } from "lucide-react";
import { emotionApi, type EmotionResult } from "../../../shared/api/emotionApi";

export default function ResultsPage() {
  const { token } = useParams();
  const [analysis, setAnalysis] = useState<EmotionResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
            ler: t.ler_emotion ? { emotion: t.ler_emotion, confidence: t.ler_confidence ?? 0, probabilities: t.ler_probabilities || {}, language_detected: t.language_detected } : null,
            combined_emotion: t.combined_emotion,
            transcript_text: t.answer,
            text_analysis: t.text_analysis,
            frame_image: t.frame_image ?? null,
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
        <p className="text-slate-500">Loading your summary...</p>
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F1F5F9] px-4">
        <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-md">
          <h1 className="text-xl font-bold text-slate-900">Thank you</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-500">
            Your interview has been recorded. Your therapist will review the results with you.
          </p>
          <p className="mt-6 text-xs text-slate-400">You may now close this window.</p>
        </div>
      </div>
    );
  }

  const distribution = analysis.distribution || {};
  const overallSummary = analysis.session_highlights?.overall_summary;

  // Get interview metadata from sessionStorage
  const metaJson = sessionStorage.getItem(`amumata_result_${token}`);
  const meta = metaJson ? JSON.parse(metaJson) : null;

  return (
    <div className="min-h-screen bg-[#F1F5F9] px-4 py-8">
      <div className="mx-auto max-w-2xl">
        {/* Thank you */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">Thank you for completing the interview</h1>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-slate-500">
            Your responses have been recorded. Your therapist will review the summary before your session.
          </p>
        </div>

        {/* Interview overview */}
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-md">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Interview Overview</h2>
          <div className="grid gap-4 text-sm sm:grid-cols-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Session</p>
              <p className="mt-1 font-semibold text-slate-900">{meta?.templateName || "Interview"}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Questions Answered</p>
              <p className="mt-1 font-semibold text-slate-900">{analysis.total_questions}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Duration</p>
              <p className="mt-1 font-semibold text-slate-900">{meta ? formatTime(meta.duration) : "—"}</p>
            </div>
          </div>
        </div>

        {/* General emotional summary */}
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-md">
          <h2 className="mb-2 text-lg font-semibold text-slate-900">General Emotional Summary</h2>
          <p className="mb-4 text-xs text-slate-500">
            An overall view of the emotional tone observed across your responses.
          </p>

          {Object.keys(distribution).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(distribution)
                .sort(([, a], [, b]) => b - a)
                .map(([emotion, pct]) => (
                  <div key={emotion} className="flex items-center gap-3">
                    <span className="w-16 text-sm font-medium text-slate-700 capitalize">{emotion}</span>
                    <div className="h-4 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full transition-all ${getEmotionColor(emotion)}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-12 text-right text-sm text-slate-500">{pct}%</span>
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400">No emotional summary available.</p>
          )}

          {overallSummary && (
            <div className="mt-5 rounded-lg bg-teal-50 p-4">
              <p className="text-xs font-medium text-teal-700">Overall Summary</p>
              <p className="mt-1 text-sm leading-relaxed text-teal-800">{overallSummary}</p>
            </div>
          )}
        </div>

        {/* What happens next */}
        <div className="mb-6 rounded-xl border border-teal-200 bg-teal-50/50 p-6">
          <div className="flex items-start gap-3">
            <Users size={20} className="mt-0.5 shrink-0 text-teal-600" />
            <div>
              <p className="font-semibold text-teal-900">What happens next</p>
              <p className="mt-1 text-sm leading-relaxed text-teal-800">
                Your therapist will review this summary together with your session. This summary supports
                the conversation — it does not replace professional judgment.
              </p>
            </div>
          </div>
        </div>

        {/* Support note */}
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-start gap-3">
            <Heart size={20} className="mt-0.5 shrink-0 text-teal-600" />
            <div>
              <p className="font-semibold text-slate-900">Take care of yourself</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-500">
                If you feel overwhelmed, reach out to someone you trust. In the Philippines, Hopeline is
                available at 0917-558-4673.
              </p>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mb-6 rounded-xl border border-orange-200 bg-orange-50 p-5">
          <div className="flex items-start gap-3">
            <Shield size={18} className="mt-0.5 shrink-0 text-orange-600" />
            <p className="text-sm leading-relaxed text-orange-700">
              <strong>Disclaimer:</strong> This is an AI-assisted emotional pre-evaluation, not a clinical
              diagnosis. Results are interpreted by a licensed mental health professional.
            </p>
          </div>
        </div>

        {/* Terminal state — no route into the therapist app */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <p className="text-sm font-medium text-slate-700">Interview complete</p>
          <p className="mt-1 text-xs text-slate-400">You may now close this window.</p>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Amumata — AI-Assisted Emotional Pre-Evaluation System &bull; Davao City, 2026
        </p>
      </div>
    </div>
  );
}
