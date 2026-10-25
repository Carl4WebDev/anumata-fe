import { describe, test, expect } from "vitest";
import {
  filterHistory,
  countActiveFilters,
  isOverdueFollowUp,
  EMPTY_HISTORY_FILTERS,
  type HistoryEntry,
  type HistoryFilters,
} from "./historyFilters";
import type { MappedSession } from "../../../shared/types/session";
import type { FollowUp } from "../../../shared/api/followUpsApi";

function session(partial: Partial<MappedSession>): MappedSession {
  return {
    id: "1",
    templateName: "Wellness Check",
    date: "Jan 5, 2026",
    riskLevel: "Low",
    ...partial,
  } as MappedSession;
}

function followUp(partial: Partial<FollowUp>): FollowUp {
  return {
    follow_up_id: 1,
    recommended_date: "2026-02-01",
    reason: "Return for follow-up",
    status: "scheduled",
    ...partial,
  } as FollowUp;
}

function entry(sessionPartial: Partial<MappedSession> = {}, followUpPartial?: Partial<FollowUp>): HistoryEntry {
  return {
    session: session(sessionPartial),
    followUp: followUpPartial ? followUp(followUpPartial) : undefined,
  };
}

const filters = (partial: Partial<HistoryFilters>): HistoryFilters => ({
  ...EMPTY_HISTORY_FILTERS,
  ...partial,
});

describe("filterHistory", () => {
  test("returns all entries when filters are empty", () => {
    const entries = [entry(), entry({ id: "2", templateName: "Intake" })];
    expect(filterHistory(entries, filters({}))).toHaveLength(2);
  });

  test("search matches interview type case-insensitively", () => {
    const entries = [entry({ templateName: "Wellness Check" }), entry({ id: "2", templateName: "Intake Interview" })];
    const result = filterHistory(entries, filters({ search: "intake" }));
    expect(result.map((e) => e.session.id)).toEqual(["2"]);
  });

  test("search matches display date text", () => {
    const entries = [entry({ date: "Jan 5, 2026" }), entry({ id: "2", date: "Mar 9, 2026" })];
    const result = filterHistory(entries, filters({ search: "mar 9" }));
    expect(result.map((e) => e.session.id)).toEqual(["2"]);
  });

  test("search matches ISO form of the session date", () => {
    const entries = [entry({ date: "Jan 5, 2026" })];
    expect(filterHistory(entries, filters({ search: "2026-01-05" }))).toHaveLength(1);
  });

  test("search matches follow-up reason and recommended date", () => {
    const entries = [
      entry({ id: "1" }, { reason: "Sleep issues" }),
      entry({ id: "2" }, { reason: "Medication review" }),
      entry({ id: "3" }),
    ];
    expect(filterHistory(entries, filters({ search: "sleep" })).map((e) => e.session.id)).toEqual(["1"]);
    expect(filterHistory(entries, filters({ search: "2026-02-01" })).map((e) => e.session.id)).toEqual(["1", "2"]);
  });

  test("risk filter matches risk level only when equal", () => {
    const entries = [entry({ riskLevel: "High" }), entry({ id: "2", riskLevel: "Low" }), entry({ id: "3", riskLevel: "N/A" })];
    expect(filterHistory(entries, filters({ risk: "High" })).map((e) => e.session.id)).toEqual(["1"]);
    expect(filterHistory(entries, filters({ risk: "Low" })).map((e) => e.session.id)).toEqual(["2"]);
  });

  test("follow-up filter has/none", () => {
    const entries = [entry({ id: "1" }, { status: "completed" }), entry({ id: "2" })];
    expect(filterHistory(entries, filters({ followUp: "has" })).map((e) => e.session.id)).toEqual(["1"]);
    expect(filterHistory(entries, filters({ followUp: "none" })).map((e) => e.session.id)).toEqual(["2"]);
  });

  test("follow-up filter overdue only counts active past-due follow-ups", () => {
    const overdue = followUp({ recommended_date: "2020-01-01", status: "recommended" });
    const pastButCompleted = followUp({ recommended_date: "2020-01-01", status: "completed" });
    const future = followUp({ recommended_date: "2099-01-01", status: "scheduled" });
    const entries: HistoryEntry[] = [
      { session: session({ id: "1" }), followUp: overdue },
      { session: session({ id: "2" }), followUp: pastButCompleted },
      { session: session({ id: "3" }), followUp: future },
    ];
    expect(filterHistory(entries, filters({ followUp: "overdue" })).map((e) => e.session.id)).toEqual(["1"]);
  });

  test("date range is inclusive and parses raw date-input strings as local dates", () => {
    const entries = [entry({ date: "Jan 5, 2026" }), entry({ id: "2", date: "Jan 10, 2026" }), entry({ id: "3", date: "Feb 2, 2026" })];
    const result = filterHistory(entries, filters({ dateFrom: "2026-01-05", dateTo: "2026-01-10" }));
    expect(result.map((e) => e.session.id)).toEqual(["1", "2"]);
  });

  test("date range rejects entries with unparseable dates", () => {
    const entries = [entry({ date: "N/A" })];
    expect(filterHistory(entries, filters({ dateFrom: "2026-01-01" }))).toHaveLength(0);
  });

  test("combined search and filters narrow together", () => {
    const entries = [
      entry({ id: "1", templateName: "Wellness", riskLevel: "High" }, { reason: "sleep" }),
      entry({ id: "2", templateName: "Wellness", riskLevel: "Low" }, { reason: "sleep" }),
      entry({ id: "3", templateName: "Intake", riskLevel: "High" }, { reason: "sleep" }),
    ];
    const result = filterHistory(entries, filters({ search: "sleep", risk: "High", followUp: "has" }));
    expect(result.map((e) => e.session.id)).toEqual(["1", "3"]);
  });
});

describe("countActiveFilters", () => {
  test("counts each non-default criterion once", () => {
    expect(countActiveFilters(EMPTY_HISTORY_FILTERS)).toBe(0);
    expect(countActiveFilters(filters({ search: " x ", risk: "High" }))).toBe(2);
    expect(countActiveFilters(filters({ search: "   ", followUp: "overdue", dateTo: "2026-01-01" }))).toBe(2);
  });
});

describe("isOverdueFollowUp", () => {
  test("is false for completed follow-ups regardless of date", () => {
    expect(isOverdueFollowUp(followUp({ recommended_date: "2020-01-01", status: "completed" }))).toBe(false);
  });

  test("is false for future-dated active follow-ups", () => {
    expect(isOverdueFollowUp(followUp({ recommended_date: "2099-01-01", status: "scheduled" }))).toBe(false);
  });
});
