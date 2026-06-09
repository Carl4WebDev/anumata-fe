import { Eye, Mic, MessageSquare } from "lucide-react";
import type { FacialDetails, AudioDetails, TextAnalysis } from "../../../shared/api/emotionApi";

interface EvidencePanelProps {
  questionIndex: number;
  frame_image?: string | null;
  facial_details?: FacialDetails | null;
  audio_details?: AudioDetails | null;
  text_analysis?: TextAnalysis | null;
  fer_confidence?: number;
  ser_confidence?: number;
}

export default function EvidencePanel({
  questionIndex,
  frame_image,
  facial_details,
  audio_details,
  text_analysis,
  fer_confidence,
  ser_confidence,
}: EvidencePanelProps) {
  const hasEvidence = facial_details || audio_details || text_analysis;
  if (!hasEvidence && !frame_image) return null;

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200">
        <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
          Evidence — Q{questionIndex + 1}
        </h4>
      </div>

      <div className="p-4 space-y-4">
        {/* Face Evidence */}
        {(frame_image || facial_details) && (
          <div className="flex gap-4">
            {frame_image && (
              <div className="flex-shrink-0">
                <img
                  src={frame_image}
                  alt={`Face capture at Q${questionIndex + 1}`}
                  className="w-[140px] h-[105px] object-cover rounded-lg border border-slate-200"
                />
                <p className="mt-1 text-[10px] text-slate-400 text-center">Captured at response time</p>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Eye size={14} className="text-indigo-500" />
                <span className="text-xs font-semibold text-slate-700">Facial Analysis</span>
                {fer_confidence != null && fer_confidence > 0 && (
                  <span className="text-[10px] text-slate-400 ml-auto">
                    Confidence: {Math.round(fer_confidence * 100)}%
                  </span>
                )}
              </div>
              {facial_details ? (
                <div className="space-y-1">
                  <p className="text-xs text-slate-600">
                    <span className="font-medium text-slate-700">Brows:</span> {facial_details.brows}
                  </p>
                  <p className="text-xs text-slate-600">
                    <span className="font-medium text-slate-700">Eyes:</span> {facial_details.eyes}
                  </p>
                  <p className="text-xs text-slate-600">
                    <span className="font-medium text-slate-700">Mouth:</span> {facial_details.mouth}
                  </p>
                  <p className="text-xs text-slate-600">
                    <span className="font-medium text-slate-700">Jaw:</span> {facial_details.jaw}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">Facial landmark data not available</p>
              )}
            </div>
          </div>
        )}

        {/* Voice Evidence */}
        {audio_details && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Mic size={14} className="text-emerald-500" />
              <span className="text-xs font-semibold text-slate-700">Voice Analysis</span>
              {ser_confidence != null && ser_confidence > 0 && (
                <span className="text-[10px] text-slate-400 ml-auto">
                  Confidence: {Math.round(ser_confidence * 100)}%
                </span>
              )}
            </div>
            <div className="space-y-1">
              <p className="text-xs text-slate-600">
                <span className="font-medium text-slate-700">Pitch:</span> {audio_details.pitch_label}
                {audio_details.pitch_mean_hz > 0 && ` (${audio_details.pitch_mean_hz} Hz)`}
                {audio_details.pitch_variability && audio_details.pitch_variability !== "flat and monotone"
                  ? `, ${audio_details.pitch_variability}`
                  : ""}
              </p>
              <p className="text-xs text-slate-600">
                <span className="font-medium text-slate-700">Energy:</span> {audio_details.energy_label}
              </p>
              <p className="text-xs text-slate-600">
                <span className="font-medium text-slate-700">Speech Rate:</span> {audio_details.speech_rate}
              </p>
            </div>
          </div>
        )}

        {/* Text Evidence */}
        {text_analysis && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare size={14} className="text-violet-500" />
              <span className="text-xs font-semibold text-slate-700">Language Analysis</span>
            </div>
            {text_analysis.keywords.length > 0 ? (
              <div className="space-y-1.5">
                <div className="flex flex-wrap gap-1">
                  {text_analysis.keywords.map((kw, i) => (
                    <span
                      key={i}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-600 border border-red-100"
                    >
                      {kw}
                    </span>
                  ))}
                  {text_analysis.positive_keywords.map((kw, i) => (
                    <span
                      key={`pos-${i}`}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-green-50 text-green-600 border border-green-100"
                    >
                      {kw}
                    </span>
                  ))}
                  {text_analysis.intensifiers_used.map((kw, i) => (
                    <span
                      key={`int-${i}`}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 border border-amber-100"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400">
                  {text_analysis.negative_count} negative / {text_analysis.positive_count} positive indicators
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No significant language patterns detected</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
