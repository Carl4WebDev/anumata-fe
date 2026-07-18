import { useState } from "react";
import { Eye, Mic, Languages, ChevronDown, AlertCircle } from "lucide-react";
import ConfidenceBadge from "../../../shared/components/ConfidenceBadge";
import EmotionTag from "../../../shared/components/EmotionTag";
import type { ModelEvidence } from "../hooks/useSessionComputed";

const MODEL_ICONS = { FER: Eye, SER: Mic, LER: Languages } as const;
const MODEL_LABELS = { FER: "Facial Expression", SER: "Voice Tone", LER: "Language" } as const;
const MODEL_COLORS = { FER: "text-violet-600", SER: "text-cyan-600", LER: "text-orange-600" } as const;

interface ModelSubCardProps {
  evidence: ModelEvidence;
}

export default function ModelSubCard({ evidence }: ModelSubCardProps) {
  const [expanded, setExpanded] = useState(false);
  const Icon = MODEL_ICONS[evidence.model];
  const label = MODEL_LABELS[evidence.model];
  const iconColor = MODEL_COLORS[evidence.model];

  if (!evidence.available) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3">
        <div className="flex items-center gap-2 text-slate-400">
          <AlertCircle size={14} />
          <span className="text-xs">{label} — data unavailable</span>
        </div>
      </div>
    );
  }

  const probs = evidence.probabilities;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      {/* Header — always visible */}
      <div className="flex items-center gap-2">
        <Icon size={16} className={iconColor} />
        <span className="text-xs font-medium text-slate-600">{label} ({evidence.model})</span>
        <div className="ml-auto flex items-center gap-2">
          {evidence.emotion && <EmotionTag emotion={evidence.emotion} size="sm" />}
          <ConfidenceBadge value={evidence.confidence} />
        </div>
      </div>

      {/* Details line */}
      {evidence.details && typeof evidence.details === "object" && "description" in evidence.details && (
        <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">
          {(evidence.details as Record<string, unknown>).description as string}
        </p>
      )}

      {/* Language detected for LER */}
      {evidence.model === "LER" && "languageDetected" in evidence && (
        <p className="mt-1 text-[11px] text-slate-500">
          Language: <span className="font-medium">{(evidence as Record<string, unknown>).languageDetected as string}</span>
        </p>
      )}

      {/* Expandable probabilities */}
      {probs && Object.keys(probs).length > 0 && (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setExpanded((p) => !p)}
            className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-700"
            aria-expanded={expanded}
          >
            <span>Probabilities</span>
            <ChevronDown
              size={12}
              className={`transition-transform ${expanded ? "rotate-180" : ""}`}
            />
          </button>
          {expanded && (
            <div className="mt-1.5 space-y-1">
              {Object.entries(probs)
                .sort((a, b) => b[1] - a[1])
                .map(([emotion, prob]) => (
                  <div key={emotion} className="flex items-center gap-2">
                    <span className="w-16 text-[11px] text-slate-600">{emotion}</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-slate-400"
                        style={{ width: `${Math.round(prob * 100)}%` }}
                      />
                    </div>
                    <span className="w-8 text-right text-[11px] text-slate-500">
                      {Math.round(prob * 100)}%
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
