import type { MappedSession } from "../../../shared/types/session";

function dayKeyOf(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** Day key of the local Monday 00:00 that starts the week containing `now`. */
export function startOfWeekDayKey(now: Date = new Date()): string {
  const monday = new Date(now);
  // getDay(): 0 = Sunday — shift so Monday is the first day of the week.
  const daysSinceMonday = (monday.getDay() + 6) % 7;
  monday.setDate(monday.getDate() - daysSinceMonday);
  monday.setHours(0, 0, 0, 0);
  return dayKeyOf(monday);
}

/**
 * Sessions completed since local Monday 00:00 (day-part text compare, so the
 * count is timezone-safe). A session's date is day-precision display text.
 */
export function countCompletedThisWeek(sessions: MappedSession[], now: Date = new Date()): number {
  const weekStart = startOfWeekDayKey(now);
  return sessions.filter((s) => {
    const parsed = new Date(s.date);
    if (isNaN(parsed.getTime())) return false;
    const day = dayKeyOf(parsed);
    return day >= weekStart && day <= dayKeyOf(now);
  }).length;
}

export interface AttentionSession {
  session: MappedSession;
  /** Human-readable reason the session needs therapist attention. */
  reason: string;
}

/**
 * Sessions whose AI report is missing or was generated without the LLM —
 * a processing-quality proxy, not a clinical judgment.
 */
export function sessionsNeedingAttention(sessions: MappedSession[]): AttentionSession[] {
  return sessions
    .flatMap((session) => {
      if (session.report === null) return [{ session, reason: "Missing AI report" }];
      if (session.report.report_source && session.report.report_source !== "llm") {
        const reason =
          session.report.report_source === "deterministic"
            ? "Deterministic report (LLM unavailable)"
            : "Fallback AI report (LLM unavailable)";
        return [{ session, reason }];
      }
      return [];
    })
    .sort((a, b) => (new Date(b.session.date).getTime() - new Date(a.session.date).getTime()) || 0);
}

/** Most recent sessions first. */
export function recentInterviews(sessions: MappedSession[], limit = 4): MappedSession[] {
  return [...sessions]
    .sort((a, b) => (new Date(b.date).getTime() - new Date(a.date).getTime()) || 0)
    .slice(0, limit);
}
