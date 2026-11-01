import { Zap, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import EmotionTag from "../../../shared/components/EmotionTag";
import ConfidenceBadge from "../../../shared/components/ConfidenceBadge";
import AgreementBar from "./AgreementBar";
import AIExplanation from "./AIExplanation";
import type { QuestionData } from "../hooks/useSessionComputed";

const RISK_COLORS: Record<string, string> = {
  high: "bg-red-100 text-red-700 border-red-200",
  moderate: "bg-amber-100 text-amber-700 border-amber-200",
  low: "bg-green-100 text-green-700 border-green-200",
};

interface FusionResultCardProps {
  question: QuestionData;
}

export default function FusionResultCard({ question }: FusionResultCardProps) {
  const { fusionEmotion, fusionConfidence, agreement, explanation } = question;

  // Compute risk level from emotion
  const riskLevel =
    fusionEmotion === "Sad" || fusionEmotion === "Angry"
      ? fusionConfidence > 0.6
        ? "high"
        : fusionConfidence > 0.3
          ? "moderate"
          : "low"
      : "low";

  const isMixedEvidence = agreement.score <= 33 && agreement.availableCount >= 2;
  const borderColor = isMixedEvidence ? "border-amber-300" : "border-indigo-200";
  const bgColor = isMixedEvidence ? "bg-amber-50/50" : "bg-indigo-50/50";

  return (
    <div className={`rounded-xl border-2 ${borderColor} ${bgColor} p-4`}>
      {/* Header */}
      <div className="mb-3 flex items-center gap-2">
        <Zap size={16} className={isMixedEvidence ? "text-amber-600" : "text-indigo-600"} />
        <span className={`text-sm font-semibold ${isMixedEvidence ? "text-amber-800" : "text-indigo-800"}`}>Fusion Result</span>
        {isMixedEvidence && (
          <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
            <AlertTriangle size={10} />
            Mixed Evidence
          </span>
        )}
        <span className={`ml-auto rounded-full border px-2 py-0.5 text-[10px] font-medium ${RISK_COLORS[riskLevel]}`}>
          {riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1)} Risk Indicator
        </span>
      </div>

      {/* Main metrics */}
      <div className="mb-3 flex items-center gap-3">
        <EmotionTag emotion={fusionEmotion} size="md" />
        <div className="space-y-0.5">
          <span className="text-[10px] text-slate-500">Fusion Confidence</span>
          <ConfidenceBadge value={fusionConfidence} />
        </div>
      </div>

      {/* Agreement */}
      <div className="mb-3">
        <AgreementBar agreement={agreement} />
        {/* Per-model agreement indicators */}
        {(agreement.agreeing.length > 0 || agreement.disagreeing.length > 0) && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {agreement.agreeing.map((model) => (
              <span key={model} className="flex items-center gap-1 text-[10px] text-green-700 bg-green-50 px-1.5 py-0.5 rounded">
                <CheckCircle size={10} />
                {model}
              </span>
            ))}
            {agreement.disagreeing.map((model) => (
              <span key={model} className="flex items-center gap-1 text-[10px] text-red-700 bg-red-50 px-1.5 py-0.5 rounded">
                <XCircle size={10} />
                {model}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Explanation */}
      <AIExplanation explanation={explanation} />
    </div>
  );
}
