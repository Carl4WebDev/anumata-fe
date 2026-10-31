import { describe, test, expect } from "vitest";
import {
  filterSessions,
  countActiveReportFilters,
  tallyQuestionPredictions,
  sessionEmotionCounts,
  buildTimeline,
  computeEvidenceQuality,
  buildReviewSegments,
  summarizeFollowUps,
  filterFollowUps,
  EMPTY_REPORT_FILTERS,
  type ReportFilters,
} from "./reportMetrics";
import type { MappedSession } from "../../../shared/types/session";
import type { FollowUp } from "../../../shared/api/followUpsApi";

type Response = MappedSession["responses"][number];

function response(partial: Partial<Response>): Response {
  return {
    question: "How are you feeling today?",
    answer: "I'm okay.",
    emotion: "neutral",
    emotionPct: 80,
    fer_confidence: 0.8,
    fer_emotion: "Happy",
    fer_probabilities: null,
    ser_confidence: 0.7,
    ser_emotion: "Neutral",
    ser_probabilities: null,
    ler_confidence: 0.6,
    ler_emotion: "Neutral",
    ler_probabilities: null,
    language_detected: "en",
    facial_details: { brows: "", eyes: "", mouth: "", jaw: "", description: "" },
    audio_details: null,
    text_analysis: null,
    fusion_confidence: 0.75,
    fusion_agreement: 100,
    audio_duration: 3,
    rms_level: 0.1,
    is_silence: false,
    frame_image: null,
    evidence_frames: null,
    ...partial,
  } as Response;
}

function session(partial: Partial<MappedSession>): MappedSession {
  return {
    id: "1",
    patientId: "10",
    patientName: "Juan",
    templateName: "Wellness Check",
    date: "Jan 5, 2026",
    duration: "10 min",
    riskLevel: "Low",
    indicators: [],
    emotions: { sad: 0, happy: 0, angry: 0, neutral: 0 },
    spikes: [],
    responses: [],
    emotionalEvents: [],
    sessionHighlights: null,
    notes: "",
    report: null,
    ...partial,
  } as MappedSession;
}

const filters = (partial: Partial<ReportFilters>): ReportFilters => ({
  ...EMPTY_REPORT_FILTERS,
  ...partial,
});

describe("filterSessions", () => {
  test("returns all sessions with empty filters", () => {
    const sessions = [session({}), session({ id: "2" })];
    expect(filterSessions(sessions, filters({}))).toHaveLength(2);
  });

  test("filters by patient id as string", () => {
    const sessions = [session({ patientId: "10" }), session({ id: "2", patientId: "20" })];
    expect(filterSessions(sessions, filters({ patientId: "20" })).map((s) => s.id)).toEqual(["2"]);
  });

  test("date range is inclusive and uses raw date-input strings", () => {
    const sessions = [session({ date: "Jan 5, 2026" }), session({ id: "2", date: "Jan 10, 2026" }), session({ id: "3", date: "Feb 2, 2026" })];
    const result = filterSessions(sessions, filters({ dateFrom: "2026-01-05", dateTo: "2026-01-10" }));
    expect(result.map((s) => s.id)).toEqual(["1", "2"]);
  });

  test("excludes sessions with unparseable dates when a bound is set", () => {
    const sessions = [session({ date: "N/A" })];
    expect(filterSessions(sessions, filters({ dateFrom: "2026-01-01" }))).toHaveLength(0);
  });
});

describe("countActiveReportFilters", () => {
  test("counts non-empty criteria", () => {
    expect(countActiveReportFilters(EMPTY_REPORT_FILTERS)).toBe(0);
    expect(countActiveReportFilters(filters({ dateTo: "2026-01-01", patientId: "3" }))).toBe(2);
  });
});

describe("tallyQuestionPredictions", () => {
  test("counts one vote per question-level fused label", () => {
    const sessions = [
      session({ responses: [response({ emotion: "sad" }), response({ emotion: "happy" })] }),
      session({ id: "2", responses: [response({ emotion: "sad" })] }),
    ];
    const tally = tallyQuestionPredictions(sessions);
    expect(tally.counts).toEqual({ happy: 1, sad: 2, angry: 0, neutral: 0 });
    expect(tally.questionsTotal).toBe(3);
    expect(tally.pct.sad).toBe(66.7);
    expect(tally.pct.happy).toBe(33.3);
  });

  test("tracks unclassified labels explicitly", () => {
    const sessions = [session({ responses: [response({ emotion: "confused" })] })];
    const tally = tallyQuestionPredictions(sessions);
    expect(tally.classified).toBe(0);
    expect(tally.unclassified).toBe(1);
  });

  test("empty input yields zero percentages without dividing by zero", () => {
    const tally = tallyQuestionPredictions([]);
    expect(tally.questionsTotal).toBe(0);
    expect(tally.pct.sad).toBe(0);
  });
});

describe("sessionEmotionCounts and buildTimeline", () => {
  test("per-session counts match its questions", () => {
    const s = session({ responses: [response({ emotion: "angry" }), response({ emotion: "angry" }), response({ emotion: "neutral" })] });
    const result = sessionEmotionCounts(s);
    expect(result.counts.angry).toBe(2);
    expect(result.total).toBe(3);
  });

  test("timeline sorts sessions chronologically", () => {
    const sessions = [session({ id: "1", date: "Mar 5, 2026" }), session({ id: "2", date: "Jan 1, 2026" })];
    const timeline = buildTimeline(sessions);
    expect(timeline.map((row) => row.sessionId)).toEqual(["2", "1"]);
  });
});

describe("computeEvidenceQuality", () => {
  test("counts modality availability from detail objects", () => {
    const sessions = [
      session({
        responses: [
          response({ facial_details: { brows: "", eyes: "", mouth: "", jaw: "", description: "" }, audio_details: null, text_analysis: null }),
          response({ facial_details: null, audio_details: { pitch_mean_hz: 0, pitch_std_hz: 0, pitch_label: "", energy_rms: 0, energy_label: "", speech_rate: "", pitch_variability: "", description: "" } }),
        ],
      }),
    ];
    const eq = computeEvidenceQuality(sessions);
    expect(eq.ferQuestions).toBe(1);
    expect(eq.serQuestions).toBe(1);
    expect(eq.lerQuestions).toBe(0);
    expect(eq.noUsableModality).toBe(0);
  });

  test("flags questions with no usable modality and computes mean from stored fusion scores", () => {
    const sessions = [
      session({
        responses: [
          response({ facial_details: null, audio_details: null, text_analysis: null, fusion_confidence: null }),
          response({ facial_details: null, audio_details: null, text_analysis: { label: "x" }, fusion_confidence: 0.6 }),
        ],
      }),
    ];
    const eq = computeEvidenceQuality(sessions);
    expect(eq.noUsableModality).toBe(1);
    expect(eq.meanFusedConfidence).toBe(60);
    expect(eq.fusionScoreQuestions).toBe(1);
    expect(eq.fallbackScoreQuestions).toBe(1);
  });

  test("counts silence-detected audio questions", () => {
    const eq = computeEvidenceQuality([
      session({ responses: [response({ is_silence: true }), response({ is_silence: false })] }),
    ]);
    expect(eq.silenceQuestions).toBe(1);
  });

  test("counts fallback and missing reports, treating any non-LLM source as fallback", () => {
    const sessions = [
      session({ report: { report_source: "fallback" } }),
      session({ id: "2", report: { report_source: "deterministic" } }),
      session({ id: "3", report: { report_source: "llm" } }),
      session({ id: "4", report: null }),
    ];
    const eq = computeEvidenceQuality(sessions);
    expect(eq.fallbackReports).toBe(2);
    expect(eq.missingReports).toBe(1);
  });

  test("mean confidence is null when no question has a stored fusion score", () => {
    const eq = computeEvidenceQuality([
      session({ responses: [response({ fusion_confidence: null })] }),
    ]);
    expect(eq.meanFusedConfidence).toBeNull();
    expect(eq.fallbackScoreQuestions).toBe(1);
  });
});

describe("buildReviewSegments", () => {
  test("maps spikes to question text, date, and score; sorts newest first", () => {
    const sessions = [
      session({
        id: "1",
        date: "Jan 5, 2026",
        responses: [response({ question: "Q1?" })],
        spikes: [{ questionIndex: 0, label: "Confidence high", emotion: "sad", intensity: 88, type: "modality_alert" }],
      }),
      session({
        id: "2",
        date: "Feb 5, 2026",
        responses: [response({ question: "Q2?" })],
        spikes: [{ questionIndex: 0, label: "Transition", emotion: "angry", intensity: 70 }],
      }),
    ];
    const segments = buildReviewSegments(sessions);
    expect(segments.map((seg) => seg.sessionId)).toEqual(["2", "1"]);
    expect(segments[1].question).toBe("Q1?");
    expect(segments[1].score).toBe(88);
    expect(segments[1].type).toBe("modality_alert");
    expect(segments[0].type).toBeUndefined();
  });

  test("missing question index renders as unavailable", () => {
    const segments = buildReviewSegments([
      session({ responses: [], spikes: [{ questionIndex: 5, label: "x", emotion: "sad", intensity: 50 }] }),
    ]);
    expect(segments[0].question).toBe("Question unavailable");
  });
});

describe("summarizeFollowUps", () => {
  const fu = (partial: Partial<FollowUp>): FollowUp =>
    ({ follow_up_id: 1, recommended_date: "2026-02-01", status: "scheduled", ...partial }) as FollowUp;

  test("buckets by status and date part, independent of timezone", () => {
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const summary = summarizeFollowUps([
      fu({ recommended_date: "2099-01-01" }),
      fu({ recommended_date: todayKey }),
      fu({ recommended_date: "2020-01-01", status: "recommended" }),
      fu({ recommended_date: "2020-01-01", status: "completed" }),
      fu({ recommended_date: "2020-01-01", status: "cancelled" }),
    ]);
    expect(summary).toEqual({ upcoming: 1, dueToday: 1, overdue: 1, completed: 1, other: 1 });
  });

  test("recommended_date as full ISO datetime still matches its date part", () => {
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const summary = summarizeFollowUps([fu({ recommended_date: `${todayKey}T00:00:00.000Z` })]);
    expect(summary.dueToday).toBe(1);
  });

  test("non-ISO recommended_date falls into other", () => {
    expect(summarizeFollowUps([fu({ recommended_date: "not-a-date" })]).other).toBe(1);
  });
});

describe("filterFollowUps", () => {
  const fu = (partial: Partial<FollowUp>): FollowUp =>
    ({ follow_up_id: 1, patient_id: 10, recommended_date: "2026-02-01", status: "scheduled", ...partial }) as FollowUp;

  test("filters by patient and recommended date part", () => {
    const followUps = [
      fu({ patient_id: 10, recommended_date: "2026-02-01" }),
      fu({ patient_id: 20, recommended_date: "2026-02-01" }),
      fu({ patient_id: 10, recommended_date: "2026-03-15T00:00:00.000Z" }),
    ];
    expect(filterFollowUps(followUps, filters({ patientId: "10", dateTo: "2026-02-28" })).map((f) => f.follow_up_id)).toEqual([1]);
    expect(filterFollowUps(followUps, filters({ dateFrom: "2026-03-01" })).map((f) => f.patient_id)).toEqual([10]);
  });

  test("date bounds are inclusive on the boundary days", () => {
    const followUps = [fu({ recommended_date: "2026-02-01" })];
    expect(filterFollowUps(followUps, filters({ dateFrom: "2026-02-01", dateTo: "2026-02-01" }))).toHaveLength(1);
  });

  test("follow-ups without a parseable date are excluded when a date bound is set", () => {
    const followUps = [fu({ recommended_date: "not-a-date" })];
    expect(filterFollowUps(followUps, filters({ dateFrom: "2026-01-01" }))).toHaveLength(0);
    expect(filterFollowUps(followUps, filters({}))).toHaveLength(1);
  });
});
