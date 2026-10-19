import { memo, useMemo } from "react";
import { CheckCircle, AlertCircle, XCircle, Volume2, Eye, Languages, Info } from "lucide-react";
import type { InterviewResponse } from "../../../shared/types/session";

interface EvidenceQualityCardProps {
  responses: InterviewResponse[];
}

interface ModalityStats {
  name: string;
  label: string;
  icon: typeof Eye;
  available: number;
  total: number;
  avgConfidence: number;
  inFusion: boolean;
}

function computeModalityStats(responses: InterviewResponse[]): ModalityStats[] {
  const total = responses.length || 1;

  const ferAvailable = responses.filter((r) => r.fer_emotion && r.fer_emotion !== "Unknown").length;
  const serAvailable = responses.filter((r) => r.ser_emotion && r.ser_emotion !== "Unknown").length;
  const lerAvailable = responses.filter((r) => r.ler_emotion && r.ler_emotion !== "Unknown").length;

  const ferConfs = responses.filter((r) => r.fer_confidence > 0).map((r) => r.fer_confidence);
  const serConfs = responses.filter((r) => r.ser_confidence > 0).map((r) => r.ser_confidence);
  const lerConfs = responses.filter((r) => r.ler_confidence > 0).map((r) => r.ler_confidence);

  return [
    {
      name: "fer",
      label: "Facial Expression",
      icon: Eye,
      available: ferAvailable,
      total,
      avgConfidence: ferConfs.length ? ferConfs.reduce((a, b) => a + b, 0) / ferConfs.length : 0,
      inFusion: true,
    },
    {
      name: "ser",
      label: "Voice Tone",
      icon: Volume2,
      available: serAvailable,
      total,
      avgConfidence: serConfs.length ? serConfs.reduce((a, b) => a + b, 0) / serConfs.length : 0,
      inFusion: true,
    },
    {
      name: "ler",
      label: "Language (Experimental)",
      icon: Languages,
      available: lerAvailable,
      total,
      avgConfidence: lerConfs.length ? lerConfs.reduce((a, b) => a + b, 0) / lerConfs.length : 0,
      inFusion: false, // LER weight is 0 — not included in fusion
    },
  ];
}

function computeRecordingQuality(responses: InterviewResponse[]) {
  const hasQualityData = responses.some((r) => r.audio_duration !== undefined && r.audio_duration !== null);
  const durations = responses.filter((r) => (r.audio_duration ?? 0) > 0).map((r) => r.audio_duration!);
  const silenceCount = responses.filter((r) => r.is_silence === true).length;
  const avgDuration = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;

  return {
    avgDuration: Math.round(avgDuration * 10) / 10,
    silenceCount,
    totalQuestions: responses.length,
    questionsWithAudio: durations.length,
    hasQualityData,
  };
}

function StatusIcon({ pct }: { pct: number }) {
  if (pct >= 80) return <CheckCircle size={14} className="text-emerald-500" />;
  if (pct >= 50) return <AlertCircle size={14} className="text-amber-500" />;
  return <XCircle size={14} className="text-red-500" />;
}

function CoverageBar({ available, total }: { available: number; total: number }) {
  const pct = total > 0 ? Math.round((available / total) * 100) : 0;
  const barColor = pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full bg-slate-100">
        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[11px] font-medium text-slate-500 w-8 text-right">{pct}%</span>
    </div>
  );
}

function EvidenceQualityCard({ responses }: EvidenceQualityCardProps) {
  const modalityStats = useMemo(() => computeModalityStats(responses), [responses]);
  const recordingQuality = useMemo(() => computeRecordingQuality(responses), [responses]);

  // Processing coverage: how many modalities produced output
  const fusionModalities = modalityStats.filter((m) => m.inFusion);
  const fusionCoverage = fusionModalities.reduce((sum, m) => sum + m.available, 0);
  const fusionMax = fusionModalities.reduce((sum, m) => sum + m.total, 0);
  const processingPct = fusionMax > 0 ? Math.round((fusionCoverage / fusionMax) * 100) : 0;

  // Fusion source description — only modalities with weight > 0
  const activeFusion = fusionModalities.filter((m) => m.available > 0);
  const fusionDescription = activeFusion.length >= 2
    ? `Fuses ${activeFusion.map((m) => m.label).join(" + ")} outputs`
    : activeFusion.length === 1
      ? `Fuses ${activeFusion[0].label} only — limited evidence from a single modality`
      : "No fusion data available";

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-sm font-semibold text-slate-800">Analysis Coverage</h3>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
          processingPct >= 80 ? "bg-emerald-100 text-emerald-700" :
          processingPct >= 50 ? "bg-amber-100 text-amber-700" :
          "bg-red-100 text-red-700"
        }`}>
          {processingPct}% processing
        </span>
      </div>

      {/* Modality coverage */}
      <div className="space-y-3 mb-4">
        {modalityStats.map((m) => (
          <div key={m.name} className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 w-40 shrink-0">
              <m.icon size={14} className="text-slate-400" />
              <span className="text-xs text-slate-600">{m.label}</span>
              {!m.inFusion && (
                <span className="text-[9px] px-1 py-0.5 rounded bg-slate-100 text-slate-400 border border-slate-200">not fused</span>
              )}
            </div>
            <div className="flex-1">
              <CoverageBar available={m.available} total={m.total} />
            </div>
            <div className="flex items-center gap-1 w-20 justify-end">
              <StatusIcon pct={m.total > 0 ? (m.available / m.total) * 100 : 0} />
              <span className="text-[11px] text-slate-500">{m.available}/{m.total}</span>
            </div>
            <span className="text-[11px] text-slate-400 w-20 text-right">
              {m.avgConfidence > 0 ? `${Math.round(m.avgConfidence * 100)}% conf.` : "—"}
            </span>
          </div>
        ))}
      </div>

      {/* Fusion description */}
      <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 mb-4">
        <p className="text-xs text-slate-600">
          <span className="font-medium text-slate-700">Fusion:</span> {fusionDescription}
        </p>
        {modalityStats.some((m) => !m.inFusion && m.available > 0) && (
          <p className="text-[11px] text-slate-400 mt-1">
            Language (LER) is processed but excluded from fusion (experimental, weight = 0).
          </p>
        )}
      </div>

      {/* Recording quality */}
      <div className="border-t border-slate-100 pt-3">
        <h4 className="text-xs font-medium text-slate-700 mb-2">Recording Quality</h4>
        {!recordingQuality.hasQualityData ? (
          <p className="text-xs text-slate-400 italic">
            Recording quality data unavailable for this session (analyzed before quality tracking was added).
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-slate-50 px-3 py-2 text-center">
              <p className="text-[11px] text-slate-500">Avg Duration</p>
              <p className="text-sm font-medium text-slate-700">
                {recordingQuality.avgDuration > 0 ? `${recordingQuality.avgDuration}s` : "—"}
              </p>
            </div>
            <div className="rounded-lg bg-slate-50 px-3 py-2 text-center">
              <p className="text-[11px] text-slate-500">With Audio</p>
              <p className="text-sm font-medium text-slate-700">{recordingQuality.questionsWithAudio}/{recordingQuality.totalQuestions}</p>
            </div>
            <div className="rounded-lg bg-slate-50 px-3 py-2 text-center">
              <p className="text-[11px] text-slate-500">Silence Detected</p>
              <p className={`text-sm font-medium ${recordingQuality.silenceCount > 0 ? "text-amber-600" : "text-slate-700"}`}>
                {recordingQuality.silenceCount > 0 ? `${recordingQuality.silenceCount} questions` : "None detected"}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Disclaimer */}
      <div className="mt-4 flex items-start gap-2 rounded-lg bg-blue-50 border border-blue-100 px-3 py-2">
        <Info size={14} className="text-blue-500 mt-0.5 shrink-0" />
        <p className="text-[11px] text-blue-700 leading-relaxed">
          <span className="font-medium">Processing coverage</span> = how many modalities produced output.
          <span className="font-medium"> Confidence %</span> = mean prediction confidence (not accuracy).
          <span className="font-medium"> Recording quality</span> = input data conditions.
          These are three distinct measures.
        </p>
      </div>
    </div>
  );
}

export default memo(EvidenceQualityCard);