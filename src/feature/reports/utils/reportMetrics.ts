import type { MappedSession } from "../../../shared/types/session";
import type { FollowUp } from "../../../shared/api/followUpsApi";

export const EMOTION_LABELS = ["happy", "sad", "angry", "neutral"] as const;
export type EmotionLabel = (typeof EMOTION_LABELS)[number];

export interface ReportFilters {
  /** Raw date-input strings (YYYY-MM-DD). "" = no bound. */
  dateFrom: string;
  dateTo: string;
  /** Stringified patient id. "" = all patients. */
  patientId: string;
}

export const EMPTY_REPORT_FILTERS: ReportFilters = {
  dateFrom: "",
  dateTo: "",
  patientId: "",
};

export function countActiveReportFilters(filters: ReportFilters): number {
  let n = 0;
  if (filters.dateFrom) n++;
  if (filters.dateTo) n++;
  if (filters.patientId) n++;
  return n;
}

function parseInputDate(value: string): number | null {
  if (!value) return null;
  // Raw date-input strings — append time so they parse as local midnight.
  const d = new Date(`${value}T00:00:00`);
  return isNaN(d.getTime()) ? null : d.getTime();
}

function matchesDateRange(session: MappedSession, dateFrom: string, dateTo: string): boolean {
  const from = parseInputDate(dateFrom);
  const to = parseInputDate(dateTo);
  if (from === null && to === null) return true;
  const sessionTime = new Date(session.date).getTime();
  if (isNaN(sessionTime)) return false;
  if (from !== null && sessionTime < from) return false;
  if (to !== null && sessionTime > to) return false;
  return true;
}

export function filterSessions(sessions: MappedSession[], filters: ReportFilters): MappedSession[] {
  return sessions.filter(
    (s) =>
      (filters.patientId === "" || String(s.patientId) === filters.patientId) &&
      matchesDateRange(s, filters.dateFrom, filters.dateTo),
  );
}

function isEmotionLabel(value: string): value is EmotionLabel {
  return (EMOTION_LABELS as readonly string[]).includes(value);
}

export interface EmotionTally {
  counts: Record<EmotionLabel, number>;
  /** Question-level fused predictions counted in `counts`. */
  classified: number;
  /** Questions whose fused label was outside the 4 known classes. */
  unclassified: number;
  /** All interview questions across the given sessions. */
  questionsTotal: number;
  pct: Record<EmotionLabel, number>;
}

/**
 * Question-level tally of fused predictions (one count per interview
 * question, label = the fused argmax class). Percentages are of
 * `questionsTotal`, rounded to 1 decimal.
 */
export function tallyQuestionPredictions(sessions: MappedSession[]): EmotionTally {
  const counts: Record<EmotionLabel, number> = { happy: 0, sad: 0, angry: 0, neutral: 0 };
  let unclassified = 0;
  let questionsTotal = 0;

  for (const session of sessions) {
    for (const response of session.responses) {
      questionsTotal++;
      const label = response.emotion.toLowerCase();
      if (isEmotionLabel(label)) counts[label]++;
      else unclassified++;
    }
  }

  const pct = {} as Record<EmotionLabel, number>;
  for (const label of EMOTION_LABELS) {
    pct[label] = questionsTotal > 0 ? Math.round((counts[label] / questionsTotal) * 1000) / 10 : 0;
  }

  return { counts, classified: questionsTotal - unclassified, unclassified, questionsTotal, pct };
}

export interface SessionEmotionCounts {
  counts: Record<EmotionLabel, number>;
  unclassified: number;
  total: number;
}

/** Per-session question-level label counts — input for the timeline bars. */
export function sessionEmotionCounts(session: MappedSession): SessionEmotionCounts {
  const counts: Record<EmotionLabel, number> = { happy: 0, sad: 0, angry: 0, neutral: 0 };
  let unclassified = 0;
  for (const response of session.responses) {
    const label = response.emotion.toLowerCase();
    if (isEmotionLabel(label)) counts[label]++;
    else unclassified++;
  }
  return { counts, unclassified, total: session.responses.length };
}

export interface TimelineRow {
  sessionId: string;
  patientName: string;
  templateName: string;
  date: string;
  session: MappedSession;
  emotion: SessionEmotionCounts;
}

/** Sessions in chronological order with per-session label counts. */
export function buildTimeline(sessions: MappedSession[]): TimelineRow[] {
  return sessions
    .map((session) => ({
      sessionId: session.id,
      patientName: session.patientName,
      templateName: session.templateName,
      date: session.date,
      session,
      emotion: sessionEmotionCounts(session),
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export interface EvidenceQuality {
  questionsTotal: number;
  /** Questions where each modality produced usable output (detail object present). */
  ferQuestions: number;
  serQuestions: number;
  lerQuestions: number;
  /** Questions where the audio stream was detected as silence. */
  silenceQuestions: number;
  /** Questions with no usable modality — recorded as Neutral at confidence 1.0. */
  noUsableModality: number;
  /** Questions with a stored fused confidence score. */
  fusionScoreQuestions: number;
  /** Questions without one — the UI falls back to the highest single-modality score. */
  fallbackScoreQuestions: number;
  /** Sessions whose report was generated by the deterministic fallback (LLM unavailable). */
  fallbackReports: number;
  missingReports: number;
  /**
   * Mean stored fused confidence (%) over `fusionScoreQuestions`. Raw
   * max-softmax model output, uncalibrated — a score, not a probability
   * of correctness.
   */
  meanFusedConfidence: number | null;
}

export function computeEvidenceQuality(sessions: MappedSession[]): EvidenceQuality {
  let ferQuestions = 0;
  let serQuestions = 0;
  let lerQuestions = 0;
  let silenceQuestions = 0;
  let noUsableModality = 0;
  let questionsTotal = 0;
  let fusionScoreQuestions = 0;
  let confidenceSum = 0;
  let fallbackReports = 0;
  let missingReports = 0;

  for (const session of sessions) {
    if (session.report === null) missingReports++;
    else if (session.report.report_source && session.report.report_source !== "llm") fallbackReports++;

    for (const response of session.responses) {
      questionsTotal++;
      const fer = response.facial_details !== null;
      const ser = response.audio_details !== null;
      const ler = response.text_analysis !== null;
      if (fer) ferQuestions++;
      if (ser) serQuestions++;
      if (ler) lerQuestions++;
      if (response.is_silence === true) silenceQuestions++;
      if (!fer && !ser && !ler) {
        noUsableModality++;
      }
      if (response.fusion_confidence !== null) {
        fusionScoreQuestions++;
        confidenceSum += response.fusion_confidence * 100;
      }
    }
  }

  return {
    questionsTotal,
    ferQuestions,
    serQuestions,
    lerQuestions,
    silenceQuestions,
    noUsableModality,
    fusionScoreQuestions,
    fallbackScoreQuestions: questionsTotal - fusionScoreQuestions,
    fallbackReports,
    missingReports,
    meanFusedConfidence:
      fusionScoreQuestions > 0 ? Math.round((confidenceSum / fusionScoreQuestions) * 10) / 10 : null,
  };
}

export interface ReviewSegment {
  sessionId: string;
  patientName: string;
  templateName: string;
  date: string;
  question: string;
  questionIndex: number;
  label: string;
  emotion: string;
  /** Fused prediction confidence (%) at the flagged segment — a model score, not an intensity measure. */
  score: number;
  /** Set only by the modality_alert and disagreement rules. */
  type?: string;
}

/**
 * Rule-flagged segments (from the fusion spike rules) with the question,
 * session date, and model score — newest sessions first.
 */
export function buildReviewSegments(sessions: MappedSession[]): ReviewSegment[] {
  const segments = sessions.flatMap((session) =>
    session.spikes.map((sp) => ({
      sessionId: session.id,
      patientName: session.patientName,
      templateName: session.templateName,
      date: session.date,
      question: session.responses[sp.questionIndex]?.question ?? "Question unavailable",
      questionIndex: sp.questionIndex,
      label: sp.label,
      emotion: sp.emotion,
      score: sp.intensity,
      type: sp.type,
    })),
  );
  return segments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export interface FollowUpSummary {
  upcoming: number;
  dueToday: number;
  overdue: number;
  completed: number;
  /** Cancelled or missed — kept visible so nothing disappears silently. */
  other: number;
}

/**
 * Applies the page filters to follow-ups: patient match plus the recommended
 * date within the date range (date part compared as text, ISO-sorted).
 */
export function filterFollowUps(followUps: FollowUp[], filters: ReportFilters): FollowUp[] {
  return followUps.filter((followUp) => {
    if (filters.patientId !== "" && String(followUp.patient_id) !== filters.patientId) return false;
    const due = dayKey(followUp.recommended_date);
    if (filters.dateFrom && (due === null || due < filters.dateFrom)) return false;
    if (filters.dateTo && (due === null || due > filters.dateTo)) return false;
    return true;
  });
}

function todayDayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

/** The YYYY-MM-DD date part of a serialized date, compared as text (ISO sorts correctly). */
function dayKey(value: string): string | null {
  return /^\d{4}-\d{2}-\d{2}/.exec(value)?.[0] ?? null;
}

export function summarizeFollowUps(followUps: FollowUp[]): FollowUpSummary {
  const summary: FollowUpSummary = { upcoming: 0, dueToday: 0, overdue: 0, completed: 0, other: 0 };
  const today = todayDayKey();
  for (const followUp of followUps) {
    if (followUp.status === "completed") {
      summary.completed++;
      continue;
    }
    if (followUp.status !== "recommended" && followUp.status !== "scheduled") {
      summary.other++;
      continue;
    }
    const due = dayKey(followUp.recommended_date);
    if (due === null) summary.other++;
    else if (due > today) summary.upcoming++;
    else if (due === today) summary.dueToday++;
    else summary.overdue++;
  }
  return summary;
}
