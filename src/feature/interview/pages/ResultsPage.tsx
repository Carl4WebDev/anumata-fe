import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AlertTriangle, Download } from "lucide-react";

interface ResultData {
  token: string;
  patientName: string;
  templateName: string;
  questions: string[];
  responses: { question: string; answer: string }[];
  duration: number;
  completedAt: string;
}

// Simulated emotion analysis — will be replaced with real FER/SER output
const SIMULATED_EMOTIONS = {
  distribution: { sad: 45, happy: 25, angry: 18, neutral: 12 },
  riskLevel: "Moderate" as const,
  indicators: ["Sadness", "Mild anxiety"],
  spikes: [
    { questionIndex: 1, label: "Emotional spike detected", emotion: "sad", intensity: 78 },
    { questionIndex: 3, label: "Elevated stress indicators", emotion: "angry", intensity: 62 },
  ],
};

export default function ResultsPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [result, setResult] = useState<ResultData | null>(null);

  useEffect(() => {
    if (!token) return;
    const stored = localStorage.getItem(`amumata_result_${token}`);
    if (stored) {
      setResult(JSON.parse(stored));
    }
  }, [token]);

  const emotions = SIMULATED_EMOTIONS;
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

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
          <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">Pre-Evaluation Summary</h1>
          {result && (
            <p className="mt-2 text-sm text-slate-500">
              {result.patientName} — {result.templateName} — {formatTime(result.duration)}
            </p>
          )}
        </div>

        {/* Risk Level */}
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Risk Level</h2>
            <span className="rounded-full bg-yellow-50 px-4 py-1.5 text-sm font-semibold text-yellow-700">
              {emotions.riskLevel}
            </span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {emotions.indicators.map((ind) => (
              <span key={ind} className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                {ind}
              </span>
            ))}
          </div>
        </div>

        {/* Emotion Distribution */}
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Emotion Distribution</h2>
          <div className="space-y-4">
            {Object.entries(emotions.distribution)
              .sort(([, a], [, b]) => b - a)
              .map(([label, pct]) => {
                const colors: Record<string, string> = {
                  sad: "bg-blue-500",
                  happy: "bg-green-500",
                  angry: "bg-red-500",
                  neutral: "bg-slate-400",
                };
                return (
                  <div key={label}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="capitalize text-slate-700">{label}</span>
                      <span className="text-slate-500">{pct}%</span>
                    </div>
                    <div className="h-3 w-full rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full ${colors[label] ?? "bg-slate-400"} transition-all duration-500`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Emotional Spikes */}
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Emotional Spikes Detected</h2>
          <div className="space-y-3">
            {emotions.spikes.map((spike) => (
              <div
                key={spike.questionIndex}
                className="flex items-start gap-3 rounded-xl border-l-4 border-yellow-400 bg-yellow-50 p-4"
              >
                <AlertTriangle size={18} className="shrink-0 text-yellow-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-800">{spike.label}</p>
                  <p className="text-xs text-yellow-600">
                    Question {spike.questionIndex + 1} — Intensity: {spike.intensity}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Transcript preview */}
        {result && (
          <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">Interview Transcript</h2>
            <div className="space-y-3">
              {result.responses.map((r, i) => (
                <div key={i} className="rounded-xl border border-slate-200 p-4">
                  <p className="text-sm font-medium text-blue-700">Q{i + 1}: {r.question}</p>
                  <p className="mt-2 text-sm text-slate-500 italic">{r.answer}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <div className="mb-6 rounded-2xl border border-orange-200 bg-orange-50 p-5">
          <p className="text-sm text-orange-700">
            <strong>Disclaimer:</strong> This is an AI-generated pre-evaluation summary.
            It does not constitute a clinical diagnosis. The indicators above are
            preliminary and require interpretation by a licensed mental health professional.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            onClick={() => navigate(`/interview/${token}/recommendation`)}
            className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            View Recommendation
          </button>
          <button
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <Download size={16} />
            Download PDF Report
          </button>
        </div>
      </div>
    </div>
  );
}
