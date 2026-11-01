// ============================================================
// RENAME: This file should be renamed to AiReportSection.tsx
// and the component renamed to AiReportSection.
// Update import in SessionReviewPage.tsx accordingly.
//
// The model is now llama3.2:3b, not Qwen. The component name
// is misleading but the display text already says "AI Session Summary".
// ============================================================

import { memo } from "react";
import { FileText, BookOpen, Tag, HelpCircle, Loader2, AlertCircle } from "lucide-react";
import CollapsibleSection from "../../../shared/components/CollapsibleSection";

interface QwenReportSectionProps {
  report: {
    session_summary?: string;
    topics_discussed?: string[];
    keywords?: string[];
    therapist_explanation?: string;
    suggested_follow_ups?: string[];
  } | null;
  reportStatus?: "available" | "generating" | "unavailable" | "failed";
}

function QwenReportSection({ report, reportStatus = "available" }: QwenReportSectionProps) {
  if (reportStatus === "generating") {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="flex items-center gap-2 mb-3">
          <FileText size={16} className="text-teal-500" />
          <h3 className="text-sm font-semibold text-slate-700">AI Session Summary</h3>
        </div>
        <div className="flex items-center gap-2">
          <Loader2 size={14} className="animate-spin text-teal-500" />
          <p className="text-xs text-slate-500">Generating AI Session Summary...</p>
        </div>
      </div>
    );
  }

  if (reportStatus === "failed") {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="flex items-center gap-2 mb-3">
          <FileText size={16} className="text-red-400" />
          <h3 className="text-sm font-semibold text-slate-700">AI Session Summary</h3>
        </div>
        <div className="flex items-center gap-2">
          <AlertCircle size={14} className="text-red-400" />
          <p className="text-xs text-slate-500">AI Session Summary could not be generated. The underlying analysis results are still available below.</p>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="flex items-center gap-2 mb-3">
          <FileText size={16} className="text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-700">AI Session Summary</h3>
        </div>
        <p className="text-xs text-slate-400 italic">AI Session Summary is not available for this session.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <div className="flex items-center gap-2 mb-4">
        <FileText size={16} className="text-teal-600" />
        <h3 className="text-sm font-semibold text-slate-800">AI Session Summary</h3>
        <span className="text-[10px] text-slate-400 ml-auto">AI-generated</span>
      </div>

      {/* Disclaimer */}
      <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 p-3">
        <p className="text-[11px] font-medium text-amber-800">Assistive AI Summary</p>
        <p className="text-[10px] text-amber-700 mt-0.5">
          Based on: Fusion results, Transcript, Emotional progression.
          This summary is intended to support therapist review and is not a clinical diagnosis.
        </p>
      </div>

      <div className="space-y-3">
        {/* Session Summary */}
        {report.session_summary && (
          <CollapsibleSection
            title="Session Summary"
            defaultOpen={false}
            className="rounded-lg border border-slate-100 bg-slate-50 p-3"
            titleClassName="text-xs font-semibold text-slate-700"
          >
            <p className="text-xs text-slate-600 leading-relaxed mt-2">{report.session_summary}</p>
          </CollapsibleSection>
        )}

        {/* Topics */}
        {report.topics_discussed && report.topics_discussed.length > 0 && (
          <CollapsibleSection
            title="Topics Discussed"
            className="rounded-lg border border-slate-100 bg-slate-50 p-3"
            titleClassName="text-xs font-semibold text-slate-700"
          >
            <div className="flex flex-wrap gap-1.5 mt-2">
              {report.topics_discussed.map((topic, i) => (
                <span key={i} className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-teal-50 text-teal-600 border border-teal-100">
                  <BookOpen size={10} />
                  {topic}
                </span>
              ))}
            </div>
          </CollapsibleSection>
        )}

        {/* Keywords */}
        {report.keywords && report.keywords.length > 0 && (
          <CollapsibleSection
            title="Keywords"
            className="rounded-lg border border-slate-100 bg-slate-50 p-3"
            titleClassName="text-xs font-semibold text-slate-700"
          >
            <div className="flex flex-wrap gap-1.5 mt-2">
              {report.keywords.map((kw, i) => (
                <span key={i} className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-violet-50 text-violet-600 border border-violet-100">
                  <Tag size={10} />
                  {kw}
                </span>
              ))}
            </div>
          </CollapsibleSection>
        )}

        {/* Therapist Explanation */}
        {report.therapist_explanation && (
          <CollapsibleSection
            title="Therapist Explanation"
            defaultOpen={false}
            className="rounded-lg border border-slate-100 bg-slate-50 p-3"
            titleClassName="text-xs font-semibold text-slate-700"
          >
            <p className="text-xs text-slate-600 leading-relaxed mt-2">{report.therapist_explanation}</p>
          </CollapsibleSection>
        )}

        {/* Suggested Follow-up Questions */}
        {report.suggested_follow_ups && report.suggested_follow_ups.length > 0 && (
          <CollapsibleSection
            title="Suggested Follow-up Questions"
            className="rounded-lg border border-slate-100 bg-slate-50 p-3"
            titleClassName="text-xs font-semibold text-slate-700"
          >
            <ul className="mt-2 space-y-1.5">
              {report.suggested_follow_ups.map((q, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                  <HelpCircle size={12} className="text-slate-400 mt-0.5 shrink-0" />
                  <span>{q}</span>
                </li>
              ))}
            </ul>
          </CollapsibleSection>
        )}
      </div>

      <p className="text-[10px] text-slate-400 mt-4 italic">
        This summary is AI-generated and intended as a supportive tool for therapist review. It does not constitute a clinical diagnosis. The therapist makes the final clinical judgment.
      </p>
    </div>
  );
}

export default memo(QwenReportSection);
