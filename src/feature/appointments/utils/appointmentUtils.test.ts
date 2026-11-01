import { describe, test, expect } from "vitest";
import type { Appointment } from "../../../shared/api/appointmentsApi";
import {
  WEEKDAYS,
  formatTime,
  formatDayHeading,
  manilaDateOf,
  manilaInputToIso,
  hasStarted,
  groupAppointments,
  groupByDay,
} from "./appointmentUtils";

function appt(overrides: Partial<Appointment>): Appointment {
  return {
    appointment_id: 1,
    therapist_id: 1,
    patient_id: 9,
    patient_name: "MARIA SANTOS",
    follow_up_id: null,
    status: "scheduled",
    start_at: "2026-11-02T01:00:00.000Z",
    end_at: "2026-11-02T02:00:00.000Z",
    reason: null,
    cancel_reason: null,
    created_at: "2026-10-30T00:00:00.000Z",
    updated_at: "2026-10-30T00:00:00.000Z",
    ...overrides,
  };
}

describe("time zone handling", () => {
  test("index 0 is Monday, matching the backend's ISO weekday", () => {
    expect(WEEKDAYS[0]).toBe("Mon");
    expect(WEEKDAYS[6]).toBe("Sun");
  });

  test("times are shown in Manila time regardless of device zone", () => {
    expect(formatTime("2026-11-02T01:00:00.000Z")).toMatch(/9:00\s?AM/);
  });

  test("calendar day follows Manila, not UTC", () => {
    // 23:30 UTC on Nov 1 is 07:30 on Nov 2 in Manila.
    expect(manilaDateOf("2026-11-01T23:30:00.000Z")).toBe("2026-11-02");
    expect(formatDayHeading("2026-11-02")).toBe("Monday, November 2");
  });

  test("datetime-local values are read as Manila time", () => {
    expect(manilaInputToIso("2026-11-02T09:00")).toBe("2026-11-02T01:00:00.000Z");
  });
});

describe("hasStarted", () => {
  test("true once the start time has passed", () => {
    const now = new Date("2026-11-02T01:30:00.000Z");
    expect(hasStarted(appt({}), now)).toBe(true);
    expect(hasStarted(appt({ start_at: "2026-11-02T03:00:00.000Z" }), now)).toBe(false);
  });
});

describe("groupAppointments", () => {
  const now = new Date("2026-11-02T05:00:00.000Z");

  test("splits into needs-outcome, upcoming and history", () => {
    const list = [
      appt({ appointment_id: 1, start_at: "2026-11-02T01:00:00.000Z" }), // started, still scheduled
      appt({ appointment_id: 2, start_at: "2026-11-03T01:00:00.000Z" }),
      appt({ appointment_id: 3, start_at: "2026-11-02T08:00:00.000Z" }),
      appt({ appointment_id: 4, status: "cancelled", start_at: "2026-11-01T01:00:00.000Z" }),
      appt({ appointment_id: 5, status: "completed", start_at: "2026-10-30T01:00:00.000Z" }),
    ];
    const groups = groupAppointments(list, now);
    expect(groups.needsOutcome.map((a) => a.appointment_id)).toEqual([1]);
    expect(groups.upcoming.map((a) => a.appointment_id)).toEqual([3, 2]); // soonest first
    expect(groups.history.map((a) => a.appointment_id)).toEqual([4, 5]); // newest first
  });
});

describe("groupByDay", () => {
  test("groups consecutive appointments by Manila day", () => {
    const groups = groupByDay([
      appt({ appointment_id: 1, start_at: "2026-11-02T01:00:00.000Z" }),
      appt({ appointment_id: 2, start_at: "2026-11-02T03:00:00.000Z" }),
      appt({ appointment_id: 3, start_at: "2026-11-02T17:00:00.000Z" }), // Nov 3, 01:00 Manila
    ]);
    expect(groups.map((g) => [g.date, g.items.map((a) => a.appointment_id)])).toEqual([
      ["2026-11-02", [1, 2]],
      ["2026-11-03", [3]],
    ]);
  });
});
