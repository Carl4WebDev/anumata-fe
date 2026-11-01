import { useEffect, useMemo, useState } from "react";
import { useSessions } from "../../context/sessions/useSessions";
import { usePatients } from "../../context/patients/usePatients";
import { Link } from "react-router-dom";
import { AlertTriangle, Users, Activity, BarChart3, ArrowRight, CalendarClock, RefreshCw, ShieldAlert, X } from "lucide-react";
import { DashboardSkeleton } from "../../../shared/components/Skeleton";
import EmptyState from "../../../shared/components/EmptyState";
import { followUpsApi } from "../../../shared/api/followUpsApi";
import type { FollowUp } from "../../../shared/api/followUpsApi";
import type { MappedSession } from "../../../shared/types/session";
import {
  filterSessions,
  filterFollowUps,
  countActiveReportFilters,
  tallyQuestionPredictions,
  sessionEmotionCounts,
  buildTimeline,
  computeEvidenceQuality,
  buildReviewSegments,
  summarizeFollowUps,
  EMPTY_REPORT_FILTERS,
  EMOTION_LABELS,
  type ReportFilters,
} from "../utils/reportMetrics";

const emotionColors: Record<string, string> = {
  happy: "bg-green-500",
  sad: "bg-blue-500",
  angry: "bg-red-500",
  neutral: "bg-slate-400",
};

function pct(part: number, whole: number): string {
  return whole > 0 ? `${Math.round((part / whole) * 100)}%` : "0%";
}

function dominantLabel(counts: Record<string, number>, total: number): string {
  if (total === 0) return "—";
  return Object.entries(counts).sort(([, a], [, b]) => b - a)[0]?.[0] ?? "—";
}

export default function ReportsPage() {
  const { sessions: rawSessions, loading: sessionsLoading, error: sessionsError } = useSessions();
  const { patients: rawPatients, loading: patientsLoading } = usePatients();
  const sessions = rawSessions as MappedSession[];
  const patients = rawPatients as { id: number; name: string }[];

  const [filters, setFilters] = useState<ReportFilters>(EMPTY_REPORT_FILTERS);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [followUpsError, setFollowUpsError] = useState<string | null>(null);

  const updateFilters = (patch: Partial<ReportFilters>) =>
    setFilters((prev) => ({ ...prev, ...patch }));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await followUpsApi.getAll();
        if (!cancelled) setFollowUps(res.data);
      } catch {
        if (!cancelled) setFollowUpsError("Follow-ups unavailable.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => filterSessions(sessions, filters), [sessions, filters]);
  const tally = useMemo(() => tallyQuestionPredictions(filtered), [filtered]);
  const evidence = useMemo(() => computeEvidenceQuality(filtered), [filtered]);
  const timeline = useMemo(() => buildTimeline(filtered), [filtered]);
  const segments = useMemo(() => buildReviewSegments(filtered), [filtered]);
  const filteredFollowUps = useMemo(() => filterFollowUps(followUps, filters), [followUps, filters]);
  const followUpSummary = useMemo(() => summarizeFollowUps(filteredFollowUps), [filteredFollowUps]);
  const recent = useMemo(
    () =>
      [...filtered]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5),
    [filtered],
  );

  const awaitingReview = filtered.filter(
    (s) =>
      s.riskLevel === "High" ||
      s.report === null ||
      (s.report.report_source !== undefined && s.report.report_source !== "llm"),
  ).length;

  const activeFilterCount = countActiveReportFilters(filters);

  if (sessionsLoading || patientsLoading) {
    return <DashboardSkeleton label="Loading reports…" />;
  }

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">Reports</h1>
          <p className="mt-1 text-sm text-slate-500">
            Model-predicted emotional indicators and evidence quality across completed sessions.
          </p>
        </div>
      </div>

      {/* Filters */}
      {sessions.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => updateFilters({ dateFrom: e.target.value })}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
          />
          <span className="text-xs text-slate-400">to</span>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => updateFilters({ dateTo: e.target.value })}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
          />
          <select
            value={filters.patientId}
            onChange={(e) => updateFilters({ patientId: e.target.value })}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
          >
            <option value="">All patients</option>
            {patients.map((p) => (
              <option key={p.id} value={String(p.id)}>
                {p.name}
              </option>
            ))}
          </select>
          {activeFilterCount > 0 && (
            <button
              onClick={() => setFilters(EMPTY_REPORT_FILTERS)}
              className="inline-flex items-center gap-1 text-xs font-medium text-teal-600 hover:text-teal-700"
            >
              <X size={12} />
              Clear filters
            </button>
          )}
          <span className="ml-auto text-xs text-slate-400">
            {filtered.length} of {sessions.length} sessions
          </span>
        </div>
      )}

      {sessionsError && (
        <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{sessionsError}</p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-red-700 hover:underline"
          >
            <RefreshCw size={14} />
            Retry
          </button>
        </div>
      )}

      {sessions.length === 0 && !sessionsError ? (
        <EmptyState
          icon={BarChart3}
          title="No session data yet"
          description="Complete your first interview to see model predictions and evidence quality across sessions."
        />
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
          <p className="text-sm text-slate-500">No sessions match the current filters.</p>
          <button
            onClick={() => setFilters(EMPTY_REPORT_FILTERS)}
            className="mt-2 text-sm font-medium text-teal-600 hover:text-teal-700"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <>
          {/* Overview */}
          <section className="grid grid-cols-2 gap-3 md:gap-6 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Completed Sessions</p>
                  <h2 className="mt-2 text-3xl font-bold">{filtered.length}</h2>
                  <p className="mt-1 text-xs text-slate-400">In selected range</p>
                </div>
                <Activity size={24} className="text-teal-600" />
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Total Patients</p>
                  <h2 className="mt-2 text-3xl font-bold">{patients.length}</h2>
                  <p className="mt-1 text-xs text-slate-400">Registered</p>
                </div>
                <Users size={24} className="text-teal-600" />
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Awaiting Review</p>
                  <h2 className="mt-2 text-3xl font-bold text-amber-600">{awaitingReview}</h2>
                  <p className="mt-1 text-xs text-slate-400">Proxy: risk-flagged, missing, or fallback report</p>
                </div>
                <ShieldAlert size={24} className="text-amber-500" />
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Question Predictions</p>
                  <h2 className="mt-2 text-3xl font-bold">{tally.questionsTotal}</h2>
                  <p className="mt-1 text-xs text-slate-400">Fused model outputs</p>
                </div>
                <BarChart3 size={24} className="text-teal-600" />
              </div>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-3">
            {/* Left column */}
            <div className="space-y-6 xl:col-span-2">
              {/* Predicted emotional indicator distribution */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
                <h2 className="mb-1 text-base font-semibold text-slate-900 md:mb-2">Predicted Emotional Indicators</h2>
                <p className="mb-4 text-xs text-slate-500">
                  Basis: one fused prediction per interview question (confidence-weighted FER+SER vote; LER excluded
                  from fusion). {tally.classified} questions across {filtered.length} sessions — not frame- or
                  duration-weighted{tally.unclassified > 0 ? `; ${tally.unclassified} questions had unrecognized labels` : ""}.
                </p>
                <div className="space-y-4">
                  {EMOTION_LABELS.map((label) => (
                    <div key={label}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="capitalize text-slate-700">{label}</span>
                        <span className="text-slate-500">
                          {tally.counts[label]} questions · {tally.pct[label]}%
                        </span>
                      </div>
                      <div className="h-3 w-full rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${emotionColors[label] ?? "bg-slate-400"} transition-all duration-500`}
                          style={{ width: `${tally.pct[label]}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Timeline across sessions */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
                <h2 className="mb-1 text-base font-semibold text-slate-900 md:mb-2">Predicted Indicators Across Sessions</h2>
                <p className="mb-4 text-xs text-slate-500">
                  Per-session share of question-level fused predictions, oldest to newest. Model output only — not
                  verified emotional states.
                </p>
                <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                  {timeline.map((row) => (
                    <Link
                      key={row.sessionId}
                      to={`/sessions/${row.sessionId}`}
                      className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 transition hover:border-teal-200 hover:bg-teal-50/30"
                    >
                      <div className="w-28 shrink-0">
                        <p className="text-xs font-medium text-slate-700">{row.date}</p>
                        <p className="truncate text-xs text-slate-400">{row.templateName}</p>
                      </div>
                      <div className="flex h-3 flex-1 overflow-hidden rounded-full bg-slate-100">
                        {EMOTION_LABELS.map((label) =>
                          row.emotion.counts[label] > 0 ? (
                            <div
                              key={label}
                              className={`h-full ${emotionColors[label] ?? "bg-slate-400"}`}
                              style={{ width: `${(row.emotion.counts[label] / Math.max(row.emotion.total, 1)) * 100}%` }}
                              title={`${label}: ${row.emotion.counts[label]}`}
                            />
                          ) : null,
                        )}
                      </div>
                      <div className="w-24 shrink-0 text-right">
                        <p className="text-xs font-medium capitalize text-slate-700">
                          {dominantLabel(row.emotion.counts, row.emotion.total)}
                        </p>
                        <p className="text-xs text-slate-400">{row.emotion.total} questions</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Sessions & Segments for Review */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
                <h2 className="mb-1 text-base font-semibold text-slate-900 md:mb-2">Sessions &amp; Segments for Review</h2>
                <p className="mb-4 text-xs text-slate-500">
                  Questions flagged by the fusion rules (transition, high confidence, flip, intensification, modality
                  alert, disagreement). Score = the model's fused confidence for that question at analysis time
                  (capped at 95%) — it may differ from the confidence stored in the transcript. Workflow aid, not a
                  clinical judgment.
                </p>
                {segments.length > 0 ? (
                  <div className="space-y-3">
                    {segments.map((seg, i) => (
                      <Link
                        key={`${seg.sessionId}-${seg.questionIndex}-${i}`}
                        to={`/sessions/${seg.sessionId}`}
                        className="flex items-start gap-3 rounded-xl border-l-4 border-yellow-400 bg-yellow-50 p-4 transition hover:bg-yellow-100"
                      >
                        <AlertTriangle size={16} className="mt-0.5 shrink-0 text-yellow-600" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium break-words text-yellow-800">{seg.question}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-yellow-700">
                            <span>{seg.patientName}</span>
                            <span>&middot;</span>
                            <span>{seg.templateName}</span>
                            <span>&middot;</span>
                            <span>{seg.date}</span>
                            <span>&middot;</span>
                            <span className="capitalize">{seg.emotion}</span>
                            <span>&middot;</span>
                            <span>Prediction score: {seg.score}%</span>
                            <span>&middot;</span>
                            <span>{seg.label}</span>
                            {seg.type && (
                              <span className="rounded-full border border-yellow-300 bg-yellow-100 px-2 py-0.5 text-xs font-medium">
                                {seg.type === "modality_alert" ? "Single-modality alert" : "Modality disagreement"}
                              </span>
                            )}
                          </div>
                        </div>
                        <ArrowRight size={14} className="mt-1 shrink-0 text-yellow-400" />
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="py-6 text-center text-sm text-slate-400">
                    No questions matched the review rules in this range.
                  </p>
                )}
              </div>
            </div>

            {/* Right column */}
            <div className="space-y-6">
              {/* Evidence Quality */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
                <h2 className="mb-4 text-base font-semibold text-slate-900">Evidence Quality</h2>
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-700">Usable video (FER)</span>
                      <span className="font-semibold text-slate-900">
                        {evidence.ferQuestions}/{evidence.questionsTotal} · {pct(evidence.ferQuestions, evidence.questionsTotal)}
                      </span>
                    </div>
                    <div className="mt-1 h-2.5 w-full rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-teal-500" style={{ width: pct(evidence.ferQuestions, evidence.questionsTotal) }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-700">Usable audio (SER)</span>
                      <span className="font-semibold text-slate-900">
                        {evidence.serQuestions}/{evidence.questionsTotal} · {pct(evidence.serQuestions, evidence.questionsTotal)}
                      </span>
                    </div>
                    <div className="mt-1 h-2.5 w-full rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-teal-500" style={{ width: pct(evidence.serQuestions, evidence.questionsTotal) }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-700">Usable text (LER)</span>
                      <span className="font-semibold text-slate-900">
                        {evidence.lerQuestions}/{evidence.questionsTotal} · {pct(evidence.lerQuestions, evidence.questionsTotal)}
                      </span>
                    </div>
                    <div className="mt-1 h-2.5 w-full rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-teal-500" style={{ width: pct(evidence.lerQuestions, evidence.questionsTotal) }} />
                    </div>
                  </div>
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <p className="text-sm font-semibold text-amber-800">
                      No usable modality: {evidence.noUsableModality} questions
                    </p>
                    <p className="mt-1 text-xs text-amber-700">
                      Recorded as Neutral at confidence 1.0 by the pipeline default — treat as missing data, not a
                      prediction.
                    </p>
                  </div>
                  <div className="text-sm text-slate-700">
                    Silence detected in audio: <span className="font-semibold">{evidence.silenceQuestions}</span>{" "}
                    questions
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-sm text-slate-700">
                      Mean fused confidence:{" "}
                      <span className="font-semibold text-slate-900">
                        {evidence.meanFusedConfidence !== null ? `${evidence.meanFusedConfidence}%` : "—"}
                      </span>
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Raw model score (max softmax, uncalibrated) over {evidence.fusionScoreQuestions} questions with a
                      stored fusion score. Not a probability of correctness. {evidence.fallbackScoreQuestions} questions
                      have no stored fusion score — displayed scores fall back to the highest single-modality score.
                    </p>
                  </div>
                  <div className="text-sm text-slate-700">
                    Fallback reports (LLM unavailable):{" "}
                    <span className="font-semibold">{evidence.fallbackReports}</span>
                  </div>
                  <div className="text-sm text-slate-700">
                    Missing reports: <span className="font-semibold">{evidence.missingReports}</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Processing failures are not tracked — sessions are recorded only after the full pipeline
                    completes.
                  </p>
                </div>
              </div>

              {/* Follow-up Summary */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
                <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-900">
                  <CalendarClock size={16} className="text-teal-600" />
                  Follow-up Summary
                </h2>
                {followUpsError ? (
                  <p className="text-sm text-slate-400">{followUpsError}</p>
                ) : (
                  <div className="space-y-2">
                    {[
                      { label: "Upcoming", value: followUpSummary.upcoming, color: "text-teal-600" },
                      { label: "Due today", value: followUpSummary.dueToday, color: "text-amber-600" },
                      { label: "Overdue", value: followUpSummary.overdue, color: "text-red-600" },
                      { label: "Completed", value: followUpSummary.completed, color: "text-emerald-600" },
                      { label: "Cancelled / missed / no date", value: followUpSummary.other, color: "text-slate-500" },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                        <span className="text-sm text-slate-700">{item.label}</span>
                        <span className={`text-sm font-semibold ${item.color}`}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Sessions */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
                <h2 className="mb-4 text-base font-semibold text-slate-900">Recent Sessions</h2>
                <div className="space-y-2">
                  {recent.map((s) => {
                    const counts = sessionEmotionCounts(s);
                    return (
                      <Link
                        key={s.id}
                        to={`/sessions/${s.id}`}
                        className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 transition hover:border-teal-200 hover:bg-teal-50/30"
                      >
                        <div>
                          <span className="text-sm font-medium">{s.patientName}</span>
                          <p className="text-xs text-slate-400">
                            {s.templateName} — {s.date}
                          </p>
                        </div>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold capitalize text-slate-600">
                          {dominantLabel(counts.counts, counts.total)}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
