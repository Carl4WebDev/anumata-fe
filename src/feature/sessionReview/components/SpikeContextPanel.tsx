import { ArrowLeft, AlertTriangle } from "lucide-react";

interface SpikeContextPanelProps {
  spike: {
    questionIndex?: number;
    question_index?: number;
    label: string;
    emotion: string;
    intensity: number;
  };
  transcript: {
    question: string;
    answer: string;
    combined_emotion?: string;
    fer_emotion?: string | null;
    ser_emotion?: string | null;
    fer_confidence?: number;
    ser_confidence?: number;
    frame_image?: string | null;
  }[];
  onClose: () => void;
}

const emotionColor: Record<string, string> = {
  Sad: "bg-blue-100 text-blue-700 border-blue-200",
  Angry: "bg-red-100 text-red-700 border-red-200",
  Happy: "bg-green-100 text-green-700 border-green-200",
  Neutral: "bg-slate-100 text-slate-600 border-slate-200",
};

export default function SpikeContextPanel({ spike, transcript, onClose }: SpikeContextPanelProps) {
  const spikeIdx = spike.question_index ?? spike.questionIndex ?? 0;
  const startIdx = Math.max(0, spikeIdx - 2);
  const endIdx = Math.min(transcript.length - 1, spikeIdx + 1);

  const windowEntries = [];
  for (let i = startIdx; i <= endIdx; i++) {
    const entry = transcript[i];
    if (!entry) continue;

    const emotion = entry.combined_emotion || entry.fer_emotion || entry.ser_emotion || "Neutral";
    const confidence = entry.fer_confidence || entry.ser_confidence || 0;
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
        <div className="flex items-center gap-2">
          <AlertTriangle size={18} className="text-amber-500" />
          <h3 className="font-semibold text-slate-800">Spike Context — Q{spikeIdx + 1}</h3>
          <span className={`text-xs px-2 py-0.5 rounded-full border ${emotionColor[spike.emotion] || "bg-slate-100 text-slate-600 border-slate-200"}`}>
            {spike.emotion}
          </span>
        </div>
        <button onClick={onClose} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition-colors">
          <ArrowLeft size={14} />
          Back to spikes
        </button>
      </div>

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
