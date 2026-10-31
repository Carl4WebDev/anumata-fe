import { describe, test, expect } from "vitest";
import {
  startOfWeekDayKey,
  countCompletedThisWeek,
  sessionsNeedingAttention,
  recentInterviews,
} from "./dashboardMetrics";
import type { MappedSession } from "../../../shared/types/session";

function session(partial: Partial<MappedSession>): MappedSession {
  return {
    id: "1",
    patientId: "10",
    patientName: "Juan",
    templateName: "Wellness Check",
    date: "Oct 26, 2026",
    duration: "10 min",
    riskLevel: "Low",
    indicators: [],
    emotions: { sad: 0, happy: 0, angry: 0, neutral: 0 },
    spikes: [],
    responses: [],
    emotionalEvents: [],
    sessionHighlights: null,
    notes: "",
    report: { report_source: "llm" },
    ...partial,
  } as MappedSession;
}

describe("startOfWeekDayKey", () => {
  test("returns the local Monday of the current week", () => {
    // Wed Oct 28 2026 -> Monday Oct 26
    expect(startOfWeekDayKey(new Date(2026, 9, 28, 15, 30))).toBe("2026-10-26");
  });

  test("Sunday belongs to the week that started the previous Monday", () => {
    // Sun Nov 1 2026 -> Monday Oct 26
    expect(startOfWeekDayKey(new Date(2026, 10, 1))).toBe("2026-10-26");
  });

  test("on Monday itself the boundary is the same day", () => {
    expect(startOfWeekDayKey(new Date(2026, 9, 26, 0, 0))).toBe("2026-10-26");
  });
});

describe("countCompletedThisWeek", () => {
  const now = new Date(2026, 9, 28, 12, 0); // Wed Oct 28

  test("counts sessions from Monday 00:00 local through today only", () => {
    const sessions = [
      session({ date: "Oct 24, 2026" }), // before the week
      session({ id: "2", date: "Oct 26, 2026" }), // Monday boundary — included
      session({ id: "3", date: "Oct 28, 2026" }), // today
    ];
    expect(countCompletedThisWeek(sessions, now)).toBe(2);
  });

  test("excludes future-dated and unparseable dates", () => {
    const sessions = [session({ date: "Oct 30, 2026" }), session({ id: "2", date: "N/A" })];
    expect(countCompletedThisWeek(sessions, now)).toBe(0);
  });

  test("empty list is zero", () => {
    expect(countCompletedThisWeek([], now)).toBe(0);
  });
});

describe("sessionsNeedingAttention", () => {
  test("flags missing and non-LLM reports with distinct reasons", () => {
    const sessions = [
      session({ id: "1", date: "Oct 1, 2026", report: null }),
      session({ id: "2", date: "Oct 5, 2026", report: { report_source: "fallback" } }),
      session({ id: "3", date: "Oct 6, 2026", report: { report_source: "deterministic" } }),
      session({ id: "4", date: "Oct 7, 2026", report: { report_source: "llm" } }),
    ];
    const attention = sessionsNeedingAttention(sessions);
    expect(attention.map((a) => a.session.id)).toEqual(["3", "2", "1"]);
    expect(attention[2].reason).toBe("Missing AI report");
    expect(attention[1].reason).toBe("Fallback AI report (LLM unavailable)");
    expect(attention[0].reason).toBe("Deterministic report (LLM unavailable)");
  });

  test("reports without report_source are not flagged", () => {
    expect(sessionsNeedingAttention([session({ report: {} })])).toHaveLength(0);
  });
});

describe("recentInterviews", () => {
  test("returns newest first, capped at limit", () => {
    const sessions = [
      session({ id: "1", date: "Oct 1, 2026" }),
      session({ id: "2", date: "Oct 20, 2026" }),
      session({ id: "3", date: "Oct 10, 2026" }),
    ];
    expect(recentInterviews(sessions, 2).map((s) => s.id)).toEqual(["2", "3"]);
  });
});
