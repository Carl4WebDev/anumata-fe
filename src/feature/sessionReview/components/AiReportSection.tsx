import { memo, useState, useCallback } from "react";
import { FileText, BookOpen, Tag, HelpCircle, Loader2, AlertCircle, RefreshCw, Search, AlertTriangle, Target, ShieldCheck, Crosshair } from "lucide-react";
import CollapsibleSection from "../../../shared/components/CollapsibleSection";

interface AiReportSectionProps {
  report: {
    session_summary?: string;
    topics_discussed?: string[];
    keywords?: string[];
    therapist_explanation?: string;
    therapist_evaluation?: string;
    suggested_follow_ups?: string[];
    suggested_therapist_focus?: string[];
    key_emotional_findings?: string[];
    areas_for_attention?: string[];
    evidence_quality?: { fer?: string; ser?: string; ler?: string; overall?: string };
    limitations?: string[];
    report_source?: string;
  } | null;
  reportStatus?: "available" | "generating" | "unavailable" | "failed";
  onRegenerate?: () => Promise<void>;
}

function AiReportSection({ report, reportStatus = "available", onRegenerate }: AiReportSectionProps) {
  const [regenerating, setRegenerating] = useState(false);
  const [regenError, setRegenError] = useState<string | null>(null);

  const isFallback = report?.report_source === "fallback" || (!report?.topics_discussed?.length && report?.keywords?.length === 1);

  const handleRegenerate = useCallback(async () => {
    if (!onRegenerate) return;
    setRegenerating(true);
    setRegenError(null);
    try {
      await onRegenerate();
    } catch (err) {
      setRegenError(err instanceof Error ? err.message : "Failed to regenerate report");
    } finally {
      setRegenerating(false);
    }
  }, [onRegenerate]);

  if (reportStatus === "generating" || regenerating) {
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
      <div className="rounded-xl border border-red-200 bg-white p-5 shadow-sm md:p-6">
        <div className="flex items-center gap-2 mb-3">
          <FileText size={16} className="text-red-400" />
          <h3 className="text-sm font-semibold text-slate-700">AI Session Summary</h3>
        </div>
        <div className="flex items-center gap-2">
          <AlertCircle size={14} className="text-red-400" />
          <p className="text-xs text-red-500">AI Session Summary could not be generated. The underlying analysis results are still available below.</p>
        </div>
        {onRegenerate && (
          <button
            onClick={handleRegenerate}
            className="mt-3 flex items-center gap-1.5 text-xs text-teal-600 hover:text-teal-800 transition-colors"
          >
            <RefreshCw size={12} />
            Try again
          </button>
        )}
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
        {onRegenerate && (
          <button
            onClick={handleRegenerate}
            className="mt-3 flex items-center gap-1.5 text-xs text-teal-600 hover:text-teal-800 transition-colors"
          >
            <RefreshCw size={12} />
            Generate now
          </button>
        )}
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

      {/* Fallback notice + regenerate button */}
      {isFallback && onRegenerate && (
        <div className="mb-3 rounded-lg bg-teal-50 border border-teal-200 p-3 flex items-center justify-between">
          <p className="text-[11px] text-teal-700">This is a basic template summary. Generate an AI-powered report for richer insights.</p>
          <button
            onClick={handleRegenerate}
            className="flex items-center gap-1.5 text-[11px] font-medium text-teal-600 hover:text-teal-800 transition-colors shrink-0 ml-3"
          >
            <RefreshCw size={12} />
            Regenerate
          </button>
        </div>
      )}

      {/* Regen error */}
      {regenError && (
        <div className="mb-3 rounded-lg bg-red-50 border border-red-200 p-3">
          <p className="text-[11px] text-red-600">{regenError}</p>
        </div>
      )}

      <div className="space-y-3">
        {/* 1. Session Summary */}
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

        {/* 2. Key Emotional Findings */}
        {report.key_emotional_findings && report.key_emotional_findings.length > 0 && (
          <CollapsibleSection
            title="Key Emotional Findings"
            defaultOpen={false}
            className="rounded-lg border border-slate-100 bg-slate-50 p-3"
            titleClassName="text-xs font-semibold text-slate-700"
          >
            <ul className="mt-2 space-y-1.5">
              {report.key_emotional_findings.map((finding, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                  <Search size={12} className="text-teal-500 mt-0.5 shrink-0" />
                  <span>{finding}</span>
                </li>
              ))}
            </ul>
          </CollapsibleSection>
        )}

        {/* 3. Areas for Attention */}
        {report.areas_for_attention && report.areas_for_attention.length > 0 && (
          <CollapsibleSection
            title="Areas for Attention"
            className="rounded-lg border border-slate-100 bg-slate-50 p-3"
            titleClassName="text-xs font-semibold text-slate-700"
          >
            <ul className="mt-2 space-y-1.5">
              {report.areas_for_attention.map((area, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                  <AlertTriangle size={12} className="text-amber-500 mt-0.5 shrink-0" />
                  <span>{area}</span>
                </li>
              ))}
            </ul>
          </CollapsibleSection>
        )}

        {/* 4. Therapist Evaluation */}
        {(report.therapist_evaluation || report.therapist_explanation) && (
          <CollapsibleSection
            title="Therapist Evaluation"
            defaultOpen={false}
            className="rounded-lg border border-slate-100 bg-slate-50 p-3"
            titleClassName="text-xs font-semibold text-slate-700"
          >
            <p className="text-xs text-slate-600 leading-relaxed mt-2">
              {report.therapist_evaluation || report.therapist_explanation}
            </p>
          </CollapsibleSection>
        )}

        {/* 5. Suggested Therapist Focus */}
        {report.suggested_therapist_focus && report.suggested_therapist_focus.length > 0 && (
          <CollapsibleSection
            title="Suggested Therapist Focus"
            className="rounded-lg border border-slate-100 bg-slate-50 p-3"
            titleClassName="text-xs font-semibold text-slate-700"
          >
            <ul className="mt-2 space-y-1.5">
              {report.suggested_therapist_focus.map((focus, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-slate-600">
                  <Target size={12} className="text-indigo-500 mt-0.5 shrink-0" />
                  <span>{focus}</span>
                </li>
              ))}
            </ul>
          </CollapsibleSection>
        )}

        {/* 6. Suggested Follow-up Questions */}
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

        {/* 7. Topics Discussed */}
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

        {/* 8. Keywords */}
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

        {/* 9. Evidence Quality */}
        {report.evidence_quality && (
          <CollapsibleSection
            title="Evidence Quality"
            className="rounded-lg border border-slate-100 bg-slate-50 p-3"
            titleClassName="text-xs font-semibold text-slate-700"
          >
            <div className="mt-2 grid grid-cols-2 gap-2">
              {(["fer", "ser", "ler"] as const).map((mod) => (
                <div key={mod} className="flex items-center gap-1.5 text-xs">
                  <ShieldCheck size={12} className={report.evidence_quality?.[mod] === "available" ? "text-green-500" : "text-slate-300"} />
                  <span className="uppercase font-medium text-slate-500">{mod}</span>
                  <span className={report.evidence_quality?.[mod] === "available" ? "text-green-600" : "text-slate-400"}>
                    {report.evidence_quality?.[mod] || "unknown"}
                  </span>
                </div>
              ))}
              <div className="flex items-center gap-1.5 text-xs">
                <Crosshair size={12} className="text-slate-400" />
                <span className="font-medium text-slate-500">Overall</span>
                <span className="text-slate-600 capitalize">{report.evidence_quality?.overall || "unknown"}</span>
              </div>
            </div>
          </CollapsibleSection>
        )}

        {/* 10. Limitations */}
        {report.limitations && report.limitations.length > 0 && (
          <CollapsibleSection
            title="Limitations"
            className="rounded-lg border border-slate-100 bg-slate-50 p-3"
            titleClassName="text-xs font-semibold text-slate-700"
          >
            <ul className="mt-2 space-y-1.5">
              {report.limitations.map((lim, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-slate-500 italic">
                  <AlertCircle size={12} className="text-slate-400 mt-0.5 shrink-0" />
                  <span>{lim}</span>
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

export default memo(AiReportSection);
