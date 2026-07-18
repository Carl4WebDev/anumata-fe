import { memo } from "react";
import { MessageSquare, AlertTriangle } from "lucide-react";
import ModelSubCard from "./ModelSubCard";
import FusionResultCard from "./FusionResultCard";
import PerQuestionNotes from "./PerQuestionNotes";
import EmotionTag from "../../../shared/components/EmotionTag";
import CollapsibleSection from "../../../shared/components/CollapsibleSection";
import type { QuestionData } from "../hooks/useSessionComputed";

interface QuestionCardProps {
  data: QuestionData;
  note: string;
  onNoteChange: (index: number, text: string) => void;
}

function QuestionCardInner({ data, note, onNoteChange }: QuestionCardProps) {
  return (
    <article
      id={`question-${data.index}`}
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6"
      aria-label={`Question ${data.index + 1}`}
    >
      {/* Question header */}
      <div className="mb-3 flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
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
          <EmotionTag emotion={data.fusionEmotion} size="sm" />
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
        <blockquote className="rounded-lg bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-700">
          {data.answer || <span className="italic text-slate-400">No transcript available</span>}
        </blockquote>
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

      {/* Pipeline flow: AI Evidence → Fusion */}
      <div className="flex items-center gap-2 my-3">
        <div className="h-px flex-1 bg-indigo-200" />
        <span className="text-[10px] text-indigo-400 uppercase tracking-wider">Fusion Result</span>
        <div className="h-px flex-1 bg-indigo-200" />
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
