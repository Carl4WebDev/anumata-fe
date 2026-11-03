import { memo } from "react";
import { MessageSquare, AlertTriangle, AlertCircle, CornerDownRight, HeartHandshake } from "lucide-react";
import ModelSubCard from "./ModelSubCard";
import FusionResultCard from "./FusionResultCard";
import PerQuestionNotes from "./PerQuestionNotes";
import EvidenceSnapshot from "./EvidenceSnapshot";
import EmotionTag from "../../../shared/components/EmotionTag";
import CollapsibleSection from "../../../shared/components/CollapsibleSection";
import type { QuestionData } from "../hooks/useSessionComputed";
import { feelingLabel } from "../../interview/hooks/feelingWords";
import {
  CHECK_IN_OUTCOME_LABELS,
  CHECK_IN_REASON_LABELS,
  type CheckInOutcome,
  type CheckInReason,
} from "../../interview/hooks/struggleCheck";

interface QuestionCardProps {
  data: QuestionData;
  note: string;
  onNoteChange: (index: number, text: string) => void;
}

function QuestionCardInner({ data, note, onNoteChange }: QuestionCardProps) {
  return (
    <article
      id={`question-${data.index}`}
      className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:p-6"
      aria-label={`Question ${data.index + 1}`}
    >
      {/* Question header */}
      <div className="mb-3 flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-700">
          {data.index + 1}
        </span>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-800">{data.question}</h3>
            {data.isSpike && (
              <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                <AlertTriangle size={10} />
                Spike
              </span>
            )}
          </div>
          {(data.checkIn || data.skipped) && (
            <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
              {data.checkIn && (
                <span className="flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-amber-800">
                  <HeartHandshake size={12} />
                  Check-in offered — {CHECK_IN_REASON_LABELS[data.checkIn.reason as CheckInReason] ?? data.checkIn.reason};{" "}
                  patient {CHECK_IN_OUTCOME_LABELS[data.checkIn.outcome as CheckInOutcome] ?? data.checkIn.outcome}
                </span>
              )}
              {data.skipped && (
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-slate-600">
                  Skipped by patient — not counted in the AI results
                </span>
              )}
            </p>
          )}
          {data.followUpAsked && (
            <p className="mt-1 flex items-start gap-1 text-xs text-slate-500">
              <CornerDownRight size={12} className="mt-0.5 shrink-0 text-teal-500" />
              <span>
                <span className="font-medium text-teal-700">Follow-up asked:</span> {data.followUpAsked}
                <span className="text-slate-400"> — the reply is included in the transcript below</span>
              </span>
            </p>
          )}
          <div className="flex flex-wrap items-center gap-1.5">
            <EmotionTag emotion={data.fusionEmotion} size="sm" />
            {data.feelingsTapped.length > 0 && (
              <span className="flex flex-wrap items-center gap-1 text-[11px] text-slate-500">
                <span>Patient tapped:</span>
                {data.feelingsTapped.map((key) => {
                  const word = feelingLabel(key);
                  return (
                    <span key={key} className="rounded-full border border-teal-200 bg-teal-50 px-2 py-0.5 text-teal-800">
                      {word ? `${word.face} ${word.label}` : key}
                    </span>
                  );
                })}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Transcript */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-1.5">
          <MessageSquare size={14} className="text-slate-400" />
          <span className="text-xs font-medium text-slate-600">Transcript</span>
          {data.languageDetected && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
              {data.languageDetected}
            </span>
          )}
        </div>
        {data.answer === "[Transcription failed]" ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 flex items-start gap-2">
            <AlertCircle size={14} className="text-red-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-700">Transcript unavailable</p>
              <p className="text-xs text-red-500 mt-0.5">Speech transcription failed for this response. Language analysis (LER) is also unavailable.</p>
            </div>
          </div>
        ) : (
          <blockquote className="rounded-lg bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-700">
            {data.answer || <span className="italic text-slate-400">No transcript available</span>}
          </blockquote>
        )}
      </div>

      {/* Pipeline flow: Transcript → AI Evidence */}
      <div className="flex items-center gap-2 my-3">
        <div className="h-px flex-1 bg-slate-200" />
        <span className="text-[10px] text-slate-400 uppercase tracking-wider">AI Analysis</span>
        <div className="h-px flex-1 bg-slate-200" />
      </div>

      {/* AI Evidence — collapsible */}
      <CollapsibleSection
        title="AI Evidence"
        defaultOpen={false}
        className="mb-4"
        titleClassName="text-xs font-semibold text-slate-600 uppercase tracking-wide"
      >
        <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-3">
          <ModelSubCard evidence={data.ser} />
          <ModelSubCard evidence={data.fer} />
          <ModelSubCard evidence={data.ler} />
        </div>
      </CollapsibleSection>

      {/* Evidence Snapshot — for spike questions */}
      {data.isSpike && (
        <div className="mb-4">
          <EvidenceSnapshot
            frameImage={data.frameImage}
            evidenceFrames={data.evidenceFrames}
            questionNumber={data.index + 1}
            ferEmotion={data.fer.emotion}
            ferConfidence={data.fer.confidence}
            serEmotion={data.ser.emotion}
            serConfidence={data.ser.confidence}
            lerEmotion={data.ler.emotion}
            lerConfidence={data.ler.confidence}
            fusionEmotion={data.fusionEmotion}
            fusionConfidence={data.fusionConfidence}
            explanation={data.explanation}
          />
        </div>
      )}

      {/* Pipeline flow: AI Evidence → Fusion */}
      <div className="flex items-center gap-2 my-3">
        <div className="h-px flex-1 bg-teal-200" />
        <span className="text-[10px] text-teal-500 uppercase tracking-wider">Fusion Result</span>
        <div className="h-px flex-1 bg-teal-200" />
      </div>

      {/* Fusion Result */}
      <div className="mb-4">
        <FusionResultCard question={data} />
      </div>

      {/* Therapist Notes */}
      <PerQuestionNotes
        value={note}
        onChange={(text) => onNoteChange(data.index, text)}
      />
    </article>
  );
}

export default memo(QuestionCardInner);
