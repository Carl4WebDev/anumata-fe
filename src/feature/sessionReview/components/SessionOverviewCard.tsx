import { Activity, Shield, BarChart3, AlertTriangle, FileText, CheckCircle, XCircle, Smile, ArrowRight } from "lucide-react";
import EmotionTag from "../../../shared/components/EmotionTag";
import { MOOD_SCALE } from "../../interview/hooks/moodCheck";
import ConfidenceBadge from "../../../shared/components/ConfidenceBadge";
import type { SessionOverviewData } from "../hooks/useSessionComputed";

const RISK_STYLES: Record<string, string> = {
  high: "bg-red-100 text-red-700 border-red-200",
  moderate: "bg-amber-100 text-amber-700 border-amber-200",
  low: "bg-green-100 text-green-700 border-green-200",
};

interface SessionOverviewCardProps {
  data: SessionOverviewData;
}

function MoodFace({ value }: { value: number | null }) {
  const mood = MOOD_SCALE.find((m) => m.value === value);
  if (!mood) return <span className="text-xs text-slate-400">Skipped</span>;
  return (
    <span className="inline-flex items-center gap-1 text-sm text-slate-800">
      <span aria-hidden="true">{mood.face}</span>
      {mood.label.en}
    </span>
  );
}

/** "Before 🙁 Not good → After 🙂 Good · better": the patient's self-report, next to what the AI read. */
function SelfReportMood({ report }: { report: NonNullable<SessionOverviewData["selfReport"]> }) {
  const { mood_before: before, mood_after: after } = report;
  const change =
    before !== null && after !== null
      ? after > before
        ? { text: "felt better after", className: "text-green-700" }
        : after < before
          ? { text: "felt worse after", className: "text-amber-700" }
          : { text: "no change", className: "text-slate-500" }
      : null;
  return (
    <div className="space-y-1 md:col-span-2">
      <div className="flex items-center gap-1.5 text-xs text-slate-500">
        <Smile size={12} />
        <span>Patient's own mood</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] text-slate-500">Before</span>
        <MoodFace value={before} />
        <ArrowRight size={12} className="text-slate-400" />
        <span className="text-[11px] text-slate-500">After</span>
        <MoodFace value={after} />
      </div>
      {change && <p className={`text-[11px] font-medium ${change.className}`}>{change.text}</p>}
    </div>
  );
}

export default function SessionOverviewCard({ data }: SessionOverviewCardProps) {
  const riskStyle = RISK_STYLES[data.riskLevel.toLowerCase()] ?? RISK_STYLES.low;

  return (
    <section
      className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:p-6"
      aria-label="Session Overview"
    >
      <h2 className="mb-4 text-base font-semibold text-slate-900">Session Overview</h2>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {/* Overall Emotion */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Activity size={12} />
            <span>Overall Emotion</span>
          </div>
          <EmotionTag emotion={data.overallEmotion} size="md" />
        </div>

        {/* Overall Confidence */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <BarChart3 size={12} />
            <span>Overall Confidence</span>
          </div>
          <ConfidenceBadge value={data.overallConfidence} />
        </div>

        {/* Overall Agreement */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <BarChart3 size={12} />
            <span>Overall Agreement</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-semibold ${data.overallAgreement >= 66 ? "text-green-700" : data.overallAgreement >= 33 ? "text-amber-700" : "text-red-700"}`}>
              {data.overallAgreement}%
            </span>
          </div>
        </div>

        {/* Detected Risk Indicator with reasons */}
        <div className="space-y-1 md:col-span-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Shield size={12} />
            <span>Detected Risk Indicator</span>
          </div>
          <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${riskStyle}`}>
            {data.riskLevel}
          </span>
          {data.riskReasons && data.riskReasons.length > 0 && (
            <ul className="mt-1.5 space-y-0.5">
              {data.riskReasons.map((reason, i) => (
                <li key={i} className="flex items-start gap-1.5 text-[11px] text-slate-500">
                  <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-slate-400" />
                  {reason}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* The patient's own mood, tapped before and after */}
        {data.selfReport && <SelfReportMood report={data.selfReport} />}

        {/* Highest Spike */}
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <AlertTriangle size={12} />
            <span>Highest Spike</span>
          </div>
          <span className="text-sm font-medium text-slate-800">
            {data.highestSpikeIndex !== null ? `Question ${data.highestSpikeIndex + 1}` : "None"}
          </span>
        </div>

        {/* Models Used */}
        <div className="space-y-1">
          <span className="text-xs text-slate-500">Models Used</span>
          <div className="flex flex-col gap-0.5">
            {(["fer", "ser", "ler"] as const).map((m) => (
              <div key={m} className="flex items-center gap-1.5">
                {data.modelsUsed[m] ? (
                  <CheckCircle size={12} className="text-green-600" />
                ) : (
                  <XCircle size={12} className="text-slate-300" />
                )}
                <span className="text-[11px] text-slate-600">{m.toUpperCase()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Report Status */}
        <div className="space-y-1">
          <span className="text-xs text-slate-500">Report Status</span>
          <div className="flex items-center gap-1.5">
            <FileText size={12} className={data.reportStatus === "available" ? "text-green-500" : data.reportStatus === "failed" ? "text-red-400" : "text-slate-400"} />
            <span className={`text-xs font-medium capitalize ${data.reportStatus === "available" ? "text-green-700" : data.reportStatus === "failed" ? "text-red-600" : "text-slate-700"}`}>
              {data.reportStatus === "available" ? "Generated" : data.reportStatus === "failed" ? "Failed" : data.reportStatus}
            </span>
          </div>
        </div>

        {/* Question Count */}
        <div className="space-y-1">
          <span className="text-xs text-slate-500">Questions</span>
          <span className="text-sm font-semibold text-slate-800">{data.questionCount}</span>
        </div>

        {/* Completed Analyses */}
        <div className="space-y-1">
          <span className="text-xs text-slate-500">AI Analyses</span>
          <span className="text-sm font-semibold text-slate-800">
            {data.completedAnalyses} / {data.questionCount}
          </span>
        </div>
      </div>
    </section>
  );
}
