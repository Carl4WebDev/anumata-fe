import { useState, useEffect, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Link2, ExternalLink, Brain, RefreshCw, AlertCircle, ChevronDown, ChevronUp, Sparkles, BarChart3 } from "lucide-react";
import { usePatients } from "../../context/patients/usePatients";
import { useSessions } from "../../context/sessions/useSessions";
import { patientsApi } from "../../../shared/api/patientsApi";
import type { Patient } from "../../../shared/api/patientsApi";
import type { LongitudinalReport, DeterministicAnalysis } from "../../../shared/types/session";

export default function PatientDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { patients } = usePatients();
  const { sessions } = useSessions();
  const patient = patients.find((p) => p.id === Number(id));

  // Full patient details from API (includes longitudinal_report)
  const [fullPatient, setFullPatient] = useState<Patient | null>(null);
  const [fetchingDetails, setFetchingDetails] = useState(false);

  // Longitudinal report generation state
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  // Collapsible sections
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    patterns: true,
    changes: true,
    indicators: true,
    attention: true,
    focus: true,
    questions: true,
    highlights: true,
    evidence: false,
    limitations: false,
  });

  const toggleSection = (key: string) =>
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));

  // Fetch full patient details (including longitudinal_report) from API
  const fetchPatientDetails = useCallback(async () => {
    if (!id) return;
    setFetchingDetails(true);
    try {
      const res = await patientsApi.getById(Number(id));
      setFullPatient(res.data);
    } catch {
      // Patient details fetch failed — page still works with context data
    } finally {
      setFetchingDetails(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPatientDetails();
  }, [fetchPatientDetails]);

  // Generate longitudinal report
  const handleGenerate = useCallback(async () => {
    if (!id) return;
    setGenerating(true);
    setGenerateError(null);
    try {
      const res = await patientsApi.generateLongitudinalReport(Number(id));
      setFullPatient((prev) =>
        prev ? { ...prev, longitudinal_report: res.data } : prev
      );
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to generate summary";
      setGenerateError(message);
    } finally {
      setGenerating(false);
    }
  }, [id]);

  if (!patient) {
    return (
      <div className="space-y-4">
        <Link to="/patients" className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline">
          <ArrowLeft size={16} />
          Back to Patients
        </Link>
        <p className="text-slate-500">Patient not found.</p>
      </div>
    );
  }

  const patientSessions = sessions.filter((s) => s.patientId === patient.id);

  // Compute latest emotion averages from sessions
  const avgEmotions = patientSessions.length > 0
    ? {
        sad: Math.round(patientSessions.reduce((sum, s) => sum + s.emotions.sad, 0) / patientSessions.length),
        happy: Math.round(patientSessions.reduce((sum, s) => sum + s.emotions.happy, 0) / patientSessions.length),
        angry: Math.round(patientSessions.reduce((sum, s) => sum + s.emotions.angry, 0) / patientSessions.length),
        neutral: Math.round(patientSessions.reduce((sum, s) => sum + s.emotions.neutral, 0) / patientSessions.length),
      }
    : null;

  const emotionColors: Record<string, string> = {
    sad: "bg-blue-500",
    happy: "bg-green-500",
    angry: "bg-red-500",
    neutral: "bg-slate-400",
  };

  const longitudinalReport: LongitudinalReport | null | undefined =
    fullPatient?.longitudinal_report ?? null;

  const hasCompletedSessions = patientSessions.length > 0;

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link to="/patients" className="mb-2 inline-flex items-center gap-2 text-sm text-blue-600 hover:underline">
            <ArrowLeft size={16} />
            Back to Patients
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 md:text-4xl">{patient.name}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {patient.age} &middot; {patient.gender} &middot; {patient.concern}
          </p>
        </div>
        <button
          onClick={() => navigate("/interview-links")}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          <Link2 size={18} />
          Generate Interview Link
        </button>
      </div>

      {/* Stat Cards */}
      <section className="grid grid-cols-2 gap-3 md:gap-6 lg:grid-cols-4">
        {[
          { label: "Latest AI Analysis", value: patient.status },
          { label: "Latest Risk Indicator", value: patient.risk, color: patient.risk === "High" ? "text-red-600" : patient.risk === "Moderate" ? "text-yellow-600" : patient.risk === "Low" ? "text-green-600" : "" },
          { label: "Total Sessions", value: String(patientSessions.length) },
          { label: "Last Interview", value: patientSessions.length > 0 ? patientSessions[0].date : "N/A" },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
            <p className="text-xs text-slate-500 md:text-sm">{card.label}</p>
            <h3 className={`mt-1 text-lg font-semibold md:mt-2 md:text-xl ${card.color ?? ""}`}>{card.value}</h3>
          </div>
        ))}
      </section>

      {/* AI-Assisted Progress Summary */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between md:mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
              <Brain size={20} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold md:text-xl">AI-Assisted Progress Summary</h2>
              <p className="text-xs text-slate-400">Cross-session emotional pattern analysis</p>
            </div>
          </div>
          {hasCompletedSessions && (
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw size={16} className={generating ? "animate-spin" : ""} />
              {generating ? "Generating..." : longitudinalReport ? "Regenerate" : "Generate Summary"}
            </button>
          )}
        </div>

        {/* Error state */}
        {generateError && (
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
            <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-500" />
            <div>
              <p className="text-sm font-medium text-red-800">Generation failed</p>
              <p className="mt-0.5 text-xs text-red-600">{generateError}</p>
            </div>
          </div>
        )}

        {/* No completed sessions */}
        {!hasCompletedSessions && (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 py-10 text-center">
            <Brain size={32} className="mx-auto text-slate-300" />
            <p className="mt-3 text-sm text-slate-500">
              Complete at least one interview to generate a progress summary.
            </p>
          </div>
        )}

        {/* Loading state */}
        {hasCompletedSessions && fetchingDetails && !longitudinalReport && (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 py-10 text-center">
            <RefreshCw size={24} className="mx-auto animate-spin text-slate-400" />
            <p className="mt-3 text-sm text-slate-500">Loading summary...</p>
          </div>
        )}

        {/* Report content */}
        {hasCompletedSessions && longitudinalReport && (
          <LongitudinalReportContent
            report={longitudinalReport}
            expandedSections={expandedSections}
            toggleSection={toggleSection}
          />
        )}

        {/* Empty state — sessions exist but no report generated yet */}
        {hasCompletedSessions && !fetchingDetails && !longitudinalReport && !generating && !generateError && (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 py-10 text-center">
            <Brain size={32} className="mx-auto text-slate-300" />
            <p className="mt-3 text-sm text-slate-500">
              No summary generated yet. Click &quot;Generate Summary&quot; to create an AI-assisted progress analysis.
            </p>
          </div>
        )}
      </section>

      {/* Content: Interview History + Emotional Trend */}
      <section className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6 lg:col-span-2">
          <h2 className="mb-4 text-lg font-semibold md:mb-6 md:text-xl">Interview History</h2>
          {patientSessions.length > 0 ? (
            <div className="space-y-3">
              {patientSessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between rounded-xl border border-slate-200 p-4 transition hover:border-blue-200 hover:bg-blue-50/30"
                >
                  <div>
                    <span className="text-sm font-medium">{session.templateName}</span>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-xs text-slate-400">{session.date}</span>
                      <span className="text-xs text-slate-300">&middot;</span>
                      <span className="text-xs text-slate-400">{session.duration}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          session.riskLevel === "High"
                            ? "bg-red-50 text-red-600"
                            : session.riskLevel === "Moderate"
                              ? "bg-yellow-50 text-yellow-600"
                              : "bg-green-50 text-green-600"
                        }`}
                      >
                        {session.riskLevel}
                      </span>
                    </div>
                  </div>
                  <Link
                    to={`/sessions/${session.id}`}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:underline"
                  >
                    Review
                    <ExternalLink size={14} />
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-slate-400">No interviews yet. Generate an interview link to get started.</p>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
          <h2 className="mb-4 text-lg font-semibold md:mb-6 md:text-xl">Emotional Indicator Trend</h2>
          {avgEmotions ? (
            <div className="space-y-4">
              {Object.entries(avgEmotions)
                .sort(([, a], [, b]) => b - a)
                .map(([label, pct]) => (
                  <div key={label}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="capitalize">{label}</span>
                      <span className="text-slate-500">{pct}%</span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full ${emotionColors[label] ?? "bg-slate-400"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-slate-400">No emotion data yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}

// =============================================================================
// Longitudinal Report Display
//
// Two-layer architecture:
// - Deterministic findings are ALWAYS shown (from _deterministic_analysis)
// - LLM interpretation is shown when available (report_source === "llm")
// - When LLM is unavailable, shows "Evidence-Based Summary" indicator
//
// Data flow:
//   Backend computes _compute_longitudinal_analysis() → structured findings
//   LLM optionally interprets → therapist-friendly narrative
//   Frontend displays both layers with clear source indication
// =============================================================================

function SourceIndicator({ reportSource }: { reportSource?: string }) {
  const isLLM = reportSource === "llm";
  const isDeterministic = reportSource === "deterministic";

  if (isLLM) {
    return (
      <div className="mb-4 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
        <Sparkles size={14} className="text-blue-600" />
        <span className="text-xs font-medium text-blue-800">AI-Assisted Interpretation</span>
        <span className="text-xs text-blue-500">— Interpretation generated from the patient's longitudinal session data and detected emotional indicators.</span>
      </div>
    );
  }

  if (isDeterministic) {
    return (
      <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
        <BarChart3 size={14} className="text-amber-600" />
        <span className="text-xs font-medium text-amber-800">Evidence-Based Summary</span>
        <span className="text-xs text-amber-600">— AI interpretation is temporarily unavailable. Findings are based on recorded session data and detected emotional indicators.</span>
      </div>
    );
  }

  // Legacy fallback
  if (reportSource === "fallback") {
    return (
      <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
        <BarChart3 size={14} className="text-amber-600" />
        <span className="text-xs font-medium text-amber-800">Evidence-Based Summary</span>
        <span className="text-xs text-amber-600">— AI interpretation is temporarily unavailable.</span>
      </div>
    );
  }

  return null;
}

interface ReportSectionProps {
  title: string;
  icon: string;
  items: string[];
  expanded: boolean;
  onToggle: () => void;
  color?: string;
  children?: React.ReactNode;
}

function ReportSection({ title, icon, items, expanded, onToggle, color = "slate", children }: ReportSectionProps) {
  if ((!items || items.length === 0) && !children) return null;

  const colorClasses: Record<string, string> = {
    slate: "border-slate-200",
    amber: "border-amber-200 bg-amber-50/30",
    green: "border-green-200 bg-green-50/30",
    blue: "border-blue-200 bg-blue-50/30",
    red: "border-red-200 bg-red-50/30",
  };

  const itemCount = items?.length ?? 0;

  return (
    <div className={`rounded-xl border p-4 ${colorClasses[color] ?? colorClasses.slate}`}>
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <span>{icon}</span>
          {title}
          {itemCount > 0 && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{itemCount}</span>
          )}
        </span>
        {expanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
      </button>
      {expanded && (
        <div className="mt-3">
          {items && items.length > 0 && (
            <ul className="space-y-2">
              {items.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                  {item}
                </li>
              ))}
            </ul>
          )}
          {children}
        </div>
      )}
    </div>
  );
}

// Session Highlight Card — for structured highlight data
function SessionHighlightCard({ highlight }: { highlight: DeterministicAnalysis["session_highlights"][0] }) {
  const typeColors: Record<string, string> = {
    most_significant_event: "border-red-200 bg-red-50/50",
    most_recent_concern: "border-amber-200 bg-amber-50/50",
    most_consistent_pattern: "border-green-200 bg-green-50/50",
  };

  return (
    <div className={`rounded-lg border p-3 ${typeColors[highlight.type] ?? "border-slate-200"}`}>
      <p className="text-xs font-semibold text-slate-600">{highlight.label}</p>
      {highlight.session && (
        <p className="mt-1 text-xs text-slate-500">{highlight.session}{highlight.date ? ` — ${new Date(highlight.date).toLocaleDateString()}` : ""}</p>
      )}
      {highlight.detail && (
        <p className="mt-1 text-sm text-slate-800">{highlight.detail}</p>
      )}
      {highlight.intensity && (
        <p className="mt-0.5 text-xs text-slate-500">Intensity: {highlight.intensity}</p>
      )}
    </div>
  );
}

// Distribution change row — shows early → recent with arrow
function DistributionChangeRow({ change }: { change: NonNullable<DeterministicAnalysis["session_changes"][0]["details"]>[0] }) {
  const arrowColor = change.direction === "increased" ? "text-green-600" : "text-red-600";
  return (
    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
      <span className="text-sm capitalize text-slate-700">{change.emotion}</span>
      <div className="flex items-center gap-2 text-sm">
        <span className="text-slate-500">{change.early}%</span>
        <span className="text-slate-300">→</span>
        <span className="text-slate-700 font-medium">{change.recent}%</span>
        <span className={`font-semibold ${arrowColor}`}>{change.arrow}</span>
      </div>
    </div>
  );
}

interface LongitudinalReportContentProps {
  report: LongitudinalReport;
  expandedSections: Record<string, boolean>;
  toggleSection: (key: string) => void;
}

function LongitudinalReportContent({ report, expandedSections, toggleSection }: LongitudinalReportContentProps) {
  // Use structured data when available (from deterministic analysis)
  const analysis = report._deterministic_analysis;

  return (
    <div className="space-y-4">
      {/* Source indicator — LLM vs Deterministic */}
      <SourceIndicator reportSource={report.report_source} />

      {/* Overall Summary */}
      {report.overall_summary && (
        <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4">
          <p className="text-sm leading-relaxed text-slate-800">{report.overall_summary}</p>
        </div>
      )}

      {/* Session Highlights — structured when available */}
      {analysis && analysis.session_highlights && analysis.session_highlights.length > 0 && (
        <div className="rounded-xl border border-slate-200 p-4">
          <button
            onClick={() => toggleSection("highlights")}
            className="flex w-full items-center justify-between text-left"
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <span>⭐</span>
              Session Highlights
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{analysis.session_highlights.length}</span>
            </span>
            {expandedSections.highlights ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
          </button>
          {expandedSections.highlights && (
            <div className="mt-3 space-y-2">
              {analysis.session_highlights.map((h, i) => (
                <SessionHighlightCard key={i} highlight={h} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Report sections grid */}
      <div className="grid gap-3 sm:grid-cols-2">
        {/* Emotional Patterns — with supporting sessions from structured data */}
        <ReportSection
          title="Recurring Emotional Patterns"
          icon="📊"
          items={report.emotional_patterns}
          expanded={expandedSections.patterns}
          onToggle={() => toggleSection("patterns")}
          color="blue"
        >
          {analysis && analysis.emotional_patterns.length > 0 && (
            <div className="mt-3 space-y-2">
              {analysis.emotional_patterns.map((p, i) => (
                <div key={i} className="rounded-lg bg-blue-50/50 px-3 py-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-800">{p.pattern}</span>
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">{p.frequency}</span>
                  </div>
                  {p.supporting_sessions.length > 0 && (
                    <p className="mt-1 text-xs text-slate-500">
                      Supporting: {p.supporting_sessions.join(", ")}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </ReportSection>

        {/* Recent Changes — with structured distribution comparison */}
        <ReportSection
          title="Recent Changes"
          icon="🔄"
          items={report.session_changes}
          expanded={expandedSections.changes}
          onToggle={() => toggleSection("changes")}
          color="green"
        >
          {analysis && analysis.session_changes.length > 0 && (
            <div className="mt-3 space-y-3">
              {analysis.session_changes.map((change, i) => (
                <div key={i}>
                  <p className="text-xs font-semibold text-slate-600">{change.label}</p>
                  {change.type === "distribution" && change.details && (
                    <div className="mt-1.5 space-y-1">
                      {change.details.map((d, j) => (
                        <DistributionChangeRow key={j} change={d} />
                      ))}
                    </div>
                  )}
                  {change.type === "risk" && change.detail && (
                    <p className="mt-1 text-sm text-slate-700">{change.detail}</p>
                  )}
                  {change.type === "spikes" && change.detail && (
                    <p className="mt-1 text-sm text-slate-700">{change.detail}</p>
                  )}
                  {change.type === "insufficient_data" && change.detail && (
                    <p className="mt-1 text-sm text-slate-500 italic">{change.detail}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </ReportSection>

        {/* Recurring Indicators — with supporting sessions */}
        <ReportSection
          title="Recurring Indicators"
          icon="🔁"
          items={report.recurring_indicators}
          expanded={expandedSections.indicators}
          onToggle={() => toggleSection("indicators")}
        >
          {analysis && analysis.recurring_indicators.length > 0 && (
            <div className="mt-3 space-y-2">
              {analysis.recurring_indicators.map((ind, i) => (
                <div key={i} className="rounded-lg bg-slate-50 px-3 py-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-800">{ind.indicator}</span>
                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-600">{ind.frequency}x</span>
                  </div>
                  {ind.supporting_sessions.length > 0 && (
                    <p className="mt-1 text-xs text-slate-500">
                      Detected in: {ind.supporting_sessions.join(", ")}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </ReportSection>

        {/* Areas for Attention — with severity and session references */}
        <ReportSection
          title="Areas for Attention"
          icon="⚠️"
          items={report.areas_for_attention}
          expanded={expandedSections.attention}
          onToggle={() => toggleSection("attention")}
          color="amber"
        >
          {analysis && analysis.areas_for_attention.length > 0 && (
            <div className="mt-3 space-y-2">
              {analysis.areas_for_attention.map((area, i) => (
                <div key={i} className={`rounded-lg px-3 py-2 ${
                  area.severity === "high" ? "bg-red-50 border border-red-200" :
                  area.severity === "moderate" ? "bg-amber-50 border border-amber-200" :
                  "bg-slate-50"
                }`}>
                  <div className="flex items-center gap-2">
                    {area.severity === "high" && <span className="h-2 w-2 rounded-full bg-red-500" />}
                    {area.severity === "moderate" && <span className="h-2 w-2 rounded-full bg-amber-500" />}
                    <span className="text-sm text-slate-800">{area.area}</span>
                  </div>
                  {area.sessions.length > 0 && (
                    <p className="mt-1 text-xs text-slate-500">Sessions: {area.sessions.join(", ")}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </ReportSection>

        {/* Suggested Therapist Focus */}
        <ReportSection
          title="Suggested Therapist Focus"
          icon="🎯"
          items={report.therapist_focus}
          expanded={expandedSections.focus}
          onToggle={() => toggleSection("focus")}
        />

        {/* Suggested Follow-Up Questions */}
        <ReportSection
          title="Suggested Follow-Up Questions"
          icon="💬"
          items={report.suggested_follow_up_questions}
          expanded={expandedSections.questions}
          onToggle={() => toggleSection("questions")}
          color="blue"
        />
      </div>

      {/* Evidence Quality — with per-modality breakdown */}
      {report.evidence_quality && (
        <div className="rounded-xl border border-slate-200 p-4">
          <button
            onClick={() => toggleSection("evidence")}
            className="flex w-full items-center justify-between text-left"
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <span>📋</span>
              Evidence Quality
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  report.evidence_quality.overall === "strong"
                    ? "bg-green-100 text-green-700"
                    : report.evidence_quality.overall === "moderate"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-red-100 text-red-700"
                }`}
              >
                {report.evidence_quality.overall}
              </span>
            </span>
            {expandedSections.evidence ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
          </button>
          {expandedSections.evidence && (
            <div className="mt-3 space-y-2">
              {/* Per-modality breakdown */}
              {(report.evidence_quality.fer || report.evidence_quality.ser || report.evidence_quality.ler) && (
                <div className="grid grid-cols-3 gap-2">
                  {report.evidence_quality.fer && (
                    <div className="rounded-lg bg-slate-50 px-3 py-2 text-center">
                      <p className="text-xs text-slate-500">FER</p>
                      <p className="text-sm font-medium text-slate-700">{report.evidence_quality.fer}</p>
                    </div>
                  )}
                  {report.evidence_quality.ser && (
                    <div className="rounded-lg bg-slate-50 px-3 py-2 text-center">
                      <p className="text-xs text-slate-500">SER</p>
                      <p className="text-sm font-medium text-slate-700">{report.evidence_quality.ser}</p>
                    </div>
                  )}
                  {report.evidence_quality.ler && (
                    <div className="rounded-lg bg-slate-50 px-3 py-2 text-center">
                      <p className="text-xs text-slate-500">LER</p>
                      <p className="text-sm font-medium text-slate-700">{report.evidence_quality.ler}</p>
                    </div>
                  )}
                </div>
              )}
              {report.evidence_quality.notes && (
                <p className="text-sm text-slate-600">{report.evidence_quality.notes}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Limitations */}
      {report.limitations && report.limitations.length > 0 && (
        <div className="rounded-xl border border-slate-200 p-4">
          <button
            onClick={() => toggleSection("limitations")}
            className="flex w-full items-center justify-between text-left"
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <span>⚠️</span>
              Limitations
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{report.limitations.length}</span>
            </span>
            {expandedSections.limitations ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
          </button>
          {expandedSections.limitations && (
            <ul className="mt-3 space-y-2">
              {report.limitations.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-300" />
                  {item}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Generated timestamp */}
      {report.generated_at && (
        <p className="text-right text-xs text-slate-400">
          Generated: {new Date(report.generated_at).toLocaleString()}
        </p>
      )}
    </div>
  );
}
