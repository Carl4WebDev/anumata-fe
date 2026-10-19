import { ArrowLeft, AlertTriangle, ExternalLink } from "lucide-react";
import type { EmotionalSpike, InterviewResponse } from "../../../shared/types/session";
import EvidenceSnapshot from "./EvidenceSnapshot";

interface SpikeContextPanelProps {
  spike: EmotionalSpike;
  transcript: InterviewResponse[];
  onClose: () => void;
}

const emotionColor: Record<string, string> = {
  Sad: "bg-blue-100 text-blue-700 border-blue-200",
  Angry: "bg-red-100 text-red-700 border-red-200",
  Happy: "bg-green-100 text-green-700 border-green-200",
  Neutral: "bg-slate-100 text-slate-600 border-slate-200",
};

const spikeTypeBadge: Record<string, { bg: string; text: string; border: string; description: string }> = {
  transition: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", description: "Emotion shifted from a positive/neutral state to a negative state." },
  high_confidence: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", description: "A negative emotion was detected with high confidence (70%+)." },
  flip: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", description: "Emotion alternated between two negative states (Sad/Angry)." },
  intensification: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200", description: "The same negative emotion intensified compared to the previous question." },
  modality_alert: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200", description: "One modality detected a strong negative signal that the fused result did not reflect." },
  disagreement: { bg: "bg-slate-100", text: "text-slate-600", border: "border-slate-300", description: "All three modalities (FER, SER, LER) predicted different emotions." },
};

export default function SpikeContextPanel({ spike, transcript, onClose }: SpikeContextPanelProps) {
  const spikeIdx = spike.question_index;
  const startIdx = Math.max(0, spikeIdx - 2);
  const endIdx = Math.min(transcript.length - 1, spikeIdx + 1);

  const spikeEntry = transcript[spikeIdx];

  const windowEntries = [];
  for (let i = startIdx; i <= endIdx; i++) {
    const entry = transcript[i];
    if (!entry) continue;

    const emotion = entry.combined_emotion || entry.fer_emotion || entry.ser_emotion || entry.ler_emotion || "Neutral";
    const confidence = entry.fer_confidence || entry.ser_confidence || entry.ler_confidence || 0;
    const pct = Math.round(confidence * 100);

    windowEntries.push({
      index: i,
      question: entry.question,
      answer: entry.answer,
      emotion,
      pct,
      isSpike: i === spikeIdx,
      frame_image: entry.frame_image,
    });
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <AlertTriangle size={18} className="text-amber-500" />
          <h3 className="font-semibold text-slate-800">Spike Context — Q{spikeIdx + 1}</h3>
          <span className={`text-xs px-2 py-0.5 rounded-full border ${emotionColor[spike.emotion] || "bg-slate-100 text-slate-600 border-slate-200"}`}>
            {spike.emotion}
          </span>
          {spike.type && spikeTypeBadge[spike.type] && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${spikeTypeBadge[spike.type].bg} ${spikeTypeBadge[spike.type].text} ${spikeTypeBadge[spike.type].border}`}>
              {spike.type.replace(/_/g, " ")}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const el = document.getElementById(`question-${spikeIdx}`);
              if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            className="flex items-center gap-1 text-sm text-teal-600 hover:text-teal-700 transition-colors"
          >
            <ExternalLink size={14} />
            Jump to Q{spikeIdx + 1}
          </button>
          <button onClick={onClose} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition-colors">
            <ArrowLeft size={14} />
            Back to spikes
          </button>
        </div>
      </div>

      {/* Spike rule description */}
      {spike.type && spikeTypeBadge[spike.type] && (
        <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5">
          <p className="text-xs text-slate-600">
            <span className="font-medium text-slate-700">Detection rule:</span>{" "}
            {spike.label}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            {spikeTypeBadge[spike.type].description}
          </p>
          <p className="text-[11px] text-slate-400 mt-1 italic">
            Spike intensity: {spike.intensity}% — this indicator reflects model output patterns, not clinical assessment.
          </p>
        </div>
      )}

      {/* Evidence Snapshot for the spike question */}
      {spikeEntry && (
        <div className="mb-4">
          <EvidenceSnapshot
            frameImage={spikeEntry.frame_image}
            evidenceFrames={spikeEntry.evidence_frames}
            questionNumber={spikeIdx + 1}
            ferEmotion={spikeEntry.fer_emotion}
            ferConfidence={spikeEntry.fer_confidence}
            serEmotion={spikeEntry.ser_emotion}
            serConfidence={spikeEntry.ser_confidence}
            lerEmotion={spikeEntry.ler_emotion}
            lerConfidence={spikeEntry.ler_confidence}
            fusionEmotion={spike.emotion}
            fusionConfidence={spikeEntry.fer_confidence || spikeEntry.ser_confidence || spikeEntry.ler_confidence || 0}
            explanation=""
          />
        </div>
      )}

      <div className="space-y-3">
        {windowEntries.map((entry) => (
          <div
            key={entry.index}
            className={`rounded-lg border p-4 ${
              entry.isSpike
                ? "border-amber-300 bg-amber-50"
                : "border-slate-200 bg-slate-50"
            }`}
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-center gap-2">
                {entry.isSpike && <AlertTriangle size={14} className="text-amber-500 flex-shrink-0" />}
                <span className="text-xs font-medium text-slate-500">
                  Q{entry.index + 1}
                  {entry.isSpike && <span className="ml-1 text-amber-600">— SPIKE</span>}
                  {entry.index < spikeIdx && <span className="ml-1 text-slate-400">(before)</span>}
                  {entry.index > spikeIdx && <span className="ml-1 text-slate-400">(after)</span>}
                </span>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full border ${emotionColor[entry.emotion] || "bg-slate-100 text-slate-600 border-slate-200"}`}>
                {entry.emotion} {entry.pct > 0 ? `${entry.pct}%` : ""}
              </span>
            </div>

            <p className="text-sm text-slate-700 font-medium mb-1">{entry.question}</p>
            <p className="text-sm text-slate-500">{entry.answer || "[Audio response recorded]"}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
