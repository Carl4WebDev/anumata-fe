import type { MappedSession } from "../../../shared/types/session";
import type { FollowUp } from "../../../shared/api/followUpsApi";

export type RiskFilter = "all" | "Low" | "Moderate" | "High";
export type FollowUpFilter = "all" | "has" | "overdue" | "none";

export interface HistoryFilters {
  search: string;
  risk: RiskFilter;
  followUp: FollowUpFilter;
  /** Raw date-input strings (YYYY-MM-DD). "" = no bound. */
  dateFrom: string;
  dateTo: string;
}

export interface HistoryEntry {
  session: MappedSession;
  followUp: FollowUp | undefined;
}

export const EMPTY_HISTORY_FILTERS: HistoryFilters = {
  search: "",
  risk: "all",
  followUp: "all",
  dateFrom: "",
  dateTo: "",
};

export const HISTORY_PAGE_SIZE = 5;

/** Active follow-up (recommended/scheduled) whose date is in the past. */
export function isOverdueFollowUp(followUp: FollowUp): boolean {
  if (followUp.status !== "recommended" && followUp.status !== "scheduled") return false;
  const due = new Date(followUp.recommended_date);
  if (isNaN(due.getTime())) return false;
  return due < new Date(new Date().toDateString());
}

export function countActiveFilters(filters: HistoryFilters): number {
  let n = 0;
  if (filters.search.trim()) n++;
  if (filters.risk !== "all") n++;
  if (filters.followUp !== "all") n++;
  if (filters.dateFrom) n++;
  if (filters.dateTo) n++;
  return n;
}

function isoDate(display: string): string {
  const d = new Date(display);
  if (isNaN(d.getTime())) return "";
  // Build from local date parts — toISOString would shift the day in non-UTC timezones.
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

function matchesSearch(entry: HistoryEntry, rawQuery: string): boolean {
  const query = rawQuery.trim().toLowerCase();
  if (!query) return true;
  const { session, followUp } = entry;
  const parts = [
    session.templateName,
    session.date,
    isoDate(session.date),
    session.riskLevel,
  ];
  if (followUp) {
    parts.push(
      followUp.recommended_date,
      new Date(followUp.recommended_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      followUp.reason ?? "",
      followUp.status,
    );
  }
  return parts.some((p) => p.toLowerCase().includes(query));
}

function matchesRisk(entry: HistoryEntry, risk: RiskFilter): boolean {
  return risk === "all" || entry.session.riskLevel === risk;
}

function matchesFollowUp(entry: HistoryEntry, filter: FollowUpFilter): boolean {
  if (filter === "all") return true;
  const { followUp } = entry;
  if (filter === "none") return !followUp;
  if (filter === "has") return Boolean(followUp);
  return followUp ? isOverdueFollowUp(followUp) : false;
}

function parseInputDate(value: string): number | null {
  if (!value) return null;
  // Date-input strings are raw YYYY-MM-DD — append time so they parse as local midnight.
  const d = new Date(`${value}T00:00:00`);
  return isNaN(d.getTime()) ? null : d.getTime();
}

function matchesDateRange(entry: HistoryEntry, dateFrom: string, dateTo: string): boolean {
  const from = parseInputDate(dateFrom);
  const to = parseInputDate(dateTo);
  if (from === null && to === null) return true;
  const sessionTime = new Date(entry.session.date).getTime();
  if (isNaN(sessionTime)) return false;
  if (from !== null && sessionTime < from) return false;
  if (to !== null && sessionTime > to) return false;
  return true;
}

export function filterHistory(entries: HistoryEntry[], filters: HistoryFilters): HistoryEntry[] {
  return entries.filter(
    (entry) =>
      matchesSearch(entry, filters.search) &&
      matchesRisk(entry, filters.risk) &&
      matchesFollowUp(entry, filters.followUp) &&
      matchesDateRange(entry, filters.dateFrom, filters.dateTo),
  );
}
