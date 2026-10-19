import { AlertTriangle } from "lucide-react";

interface TimelinePoint {
  questionIndex: number;
  emotion: string; // Capitalized version of Emotion
  confidence: number;
  isSpike: boolean;
  spikeType?: 'transition' | 'high_confidence' | 'flip' | 'intensification' | 'modality_alert' | 'disagreement';
  spikeLabel?: string;
}

interface EmotionTimelineHeatmapProps {
  points: TimelinePoint[];
  onSpikeClick?: (index: number) => void;
  showModelBars?: boolean;
}

const emotionColors: Record<string, { bg: string; bar: string; label: string }> = {
  Sad: { bg: "bg-blue-100", bar: "bg-blue-500", label: "text-blue-700" },
  Angry: { bg: "bg-red-100", bar: "bg-red-500", label: "text-red-700" },
  Happy: { bg: "bg-green-100", bar: "bg-green-500", label: "text-green-700" },
  Neutral: { bg: "bg-slate-100", bar: "bg-slate-400", label: "text-slate-600" },
  Unknown: { bg: "bg-slate-50", bar: "bg-slate-300", label: "text-slate-400" },
};

const spikeTypeStyles: Record<string, { bg: string; text: string; border: string; short: string }> = {
  transition: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", short: "Shift" },
  high_confidence: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", short: "High Conf" },
  flip: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", short: "Flip" },
  intensification: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200", short: "Intensify" },
  modality_alert: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200", short: "Modality" },
  disagreement: { bg: "bg-slate-100", text: "text-slate-600", border: "border-slate-300", short: "Disagree" },
};

export default function EmotionTimelineHeatmap({ points, onSpikeClick, showModelBars = false }: EmotionTimelineHeatmapProps) {
  if (points.length === 0) return null;

  // Compute baseline: average confidence across all non-spike points
  const nonSpikePoints = points.filter((p) => !p.isSpike);
  const baselineConfidence =
    nonSpikePoints.length > 0
      ? nonSpikePoints.reduce((sum, p) => sum + p.confidence, 0) / nonSpikePoints.length
      : points.reduce((sum, p) => sum + p.confidence, 0) / points.length;

  const baselinePct = Math.round(baselineConfidence * 100);

  // Max bar height in pixels
  const maxBarHeight = 100;
  const minHeight = 8;

  // Unique emotions for legend
  const seenEmotions = new Set(points.map((p) => p.emotion));

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-800 text-sm">Emotion Timeline</h3>
        <div className="flex items-center gap-3">
          {[...seenEmotions].map((emotion) => {
            const colors = emotionColors[emotion] || emotionColors.Unknown;
            return (
              <div key={emotion} className="flex items-center gap-1.5">
                <div className={`w-2.5 h-2.5 rounded-sm ${colors.bar}`} />
                <span className={`text-[10px] font-medium ${colors.label}`}>{emotion}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Chart area */}
      <div className="relative">
        {/* Baseline reference line */}
        <div
          className="absolute left-0 right-0 border-t border-dashed border-slate-300"
          style={{ bottom: `${Math.min(baselinePct, 95)}%` }}
        >
          <span className="absolute -top-4 right-0 text-[9px] text-slate-400">
            Baseline {baselinePct}%
          </span>
        </div>

        {/* Bars */}
        <div className="flex items-end gap-1.5 h-[120px] px-1">
          {points.map((point) => {
            const pct = Math.round(point.confidence * 100);
            const barHeight = Math.max(minHeight, (pct / 100) * maxBarHeight);
            const colors = emotionColors[point.emotion] || emotionColors.Unknown;
            const isAboveBaseline = pct > baselinePct + 10;

            return (
              <div
                key={point.questionIndex}
                className="flex-1 flex flex-col items-center justify-end relative group"
                style={{ height: `${maxBarHeight + 20}px` }}
              >
                {/* Spike type badge */}
                {point.isSpike && point.spikeType && spikeTypeStyles[point.spikeType] && (
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2">
                    <span className={`inline-block text-[7px] font-semibold px-1 py-0.5 rounded border leading-none ${spikeTypeStyles[point.spikeType].bg} ${spikeTypeStyles[point.spikeType].text} ${spikeTypeStyles[point.spikeType].border}`}>
                      {spikeTypeStyles[point.spikeType].short}
                    </span>
                  </div>
                )}
                {point.isSpike && !point.spikeType && (
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2">
                    <AlertTriangle size={12} className="text-amber-500" />
                  </div>
                )}

                {/* Hover tooltip: spike label or confidence */}
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <span className="text-[9px] font-medium text-slate-600 bg-white px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap border border-slate-200">
                    {point.isSpike && point.spikeLabel ? point.spikeLabel : `${point.emotion} ${pct}%`}
                  </span>
                </div>

                {/* Bar */}
                <div
                  className={`w-full rounded-t-md transition-all ${
                    point.isSpike ? `${colors.bar} shadow-sm cursor-pointer` : `${colors.bar} opacity-70 cursor-default`
                  } ${isAboveBaseline ? "ring-1 ring-amber-300" : ""}`}
                  style={{ height: `${barHeight}px` }}
                  onClick={() => {
                    if (point.isSpike && onSpikeClick) {
                      onSpikeClick(point.questionIndex);
                    }
                  }}
                  role={point.isSpike ? "button" : undefined}
                  tabIndex={point.isSpike ? 0 : undefined}
                  onKeyDown={(e) => {
                    if (point.isSpike && (e.key === "Enter" || e.key === " ") && onSpikeClick) {
                      e.preventDefault();
                      onSpikeClick(point.questionIndex);
                    }
                  }}
                />

                {/* Question label */}
                <span className="mt-1.5 text-[9px] text-slate-400 font-medium">
                  Q{point.questionIndex + 1}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
