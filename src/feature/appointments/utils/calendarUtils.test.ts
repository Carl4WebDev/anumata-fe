import { describe, test, expect } from "vitest";
import type { Appointment } from "../../../shared/api/appointmentsApi";
import {
  monthGrid,
  monthRange,
  shiftMonth,
  formatMonth,
  monthOf,
  filterAppointments,
  sortAppointments,
  byDay,
} from "./calendarUtils";

function appt(overrides: Partial<Appointment>): Appointment {
  return {
    appointment_id: 1,
    therapist_id: 1,
    patient_id: 9,
    patient_name: "MARIA SANTOS",
    follow_up_id: null,
    status: "completed",
    start_at: "2026-11-02T01:00:00.000Z",
    end_at: "2026-11-02T02:00:00.000Z",
    reason: null,
    cancel_reason: null,
    created_at: "2026-10-30T00:00:00.000Z",
    updated_at: "2026-10-30T00:00:00.000Z",
    ...overrides,
  };
}

describe("month helpers", () => {
  test("shift and format months, across year ends", () => {
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(formatMonth("2026-11")).toBe("November 2026");
    expect(monthOf("2026-11-02")).toBe("2026-11");
  });

  test("month range is Manila midnight to Manila midnight", () => {
    expect(monthRange("2026-11")).toEqual({
      from: "2026-10-31T16:00:00.000Z",
      to: "2026-11-30T16:00:00.000Z",
    });
  });

  test("grid starts on Monday and has full weeks", () => {
    // November 2026 starts on a Sunday.
    const weeks = monthGrid("2026-11");
    expect(weeks[0][0]).toBe("2026-10-26");
    expect(weeks[0][6]).toBe("2026-11-01");
    expect(weeks.every((w) => w.length === 7)).toBe(true);
    expect(weeks[weeks.length - 1]).toContain("2026-11-30");
    expect(weeks).toHaveLength(6);
  });

  test("a month starting on Monday has no leading days", () => {
    // June 2026 starts on a Monday.
    expect(monthGrid("2026-06")[0][0]).toBe("2026-06-01");
  });
});

describe("filters and sorting", () => {
  const list = [
    appt({ appointment_id: 1, patient_id: 9, patient_name: "MARIA SANTOS", status: "completed", start_at: "2026-11-03T01:00:00.000Z" }),
    appt({ appointment_id: 2, patient_id: 7, patient_name: "ANA REYES", status: "no_show", start_at: "2026-11-02T01:00:00.000Z" }),
    appt({ appointment_id: 3, patient_id: 9, patient_name: "MARIA SANTOS", status: "cancelled", start_at: "2026-11-01T01:00:00.000Z" }),
    appt({ appointment_id: 4, patient_id: 8, patient_name: "BEN CRUZ", status: "scheduled", start_at: "2026-11-04T01:00:00.000Z" }),
  ];
  const ids = (l: Appointment[]) => l.map((a) => a.appointment_id);

  test("filter by patient and status", () => {
    expect(ids(filterAppointments(list, { patientId: 9, statuses: ["completed", "cancelled"] }))).toEqual([1, 3]);
    expect(ids(filterAppointments(list, { patientId: null, statuses: ["completed", "no_show"] }))).toEqual([1, 2]);
    expect(filterAppointments(list, { patientId: null, statuses: [] })).toEqual([]);
  });

  test("sort by time, patient name, or status", () => {
    expect(ids(sortAppointments(list, "time"))).toEqual([3, 2, 1, 4]);
    expect(ids(sortAppointments(list, "patient"))).toEqual([2, 4, 3, 1]); // ANA, BEN, MARIA (by time)
    expect(ids(sortAppointments(list, "status"))).toEqual([4, 1, 2, 3]);
    expect(ids(list)).toEqual([1, 2, 3, 4]); // input untouched
  });

  test("groups by Manila day in time order", () => {
    const days = byDay([
      appt({ appointment_id: 1, start_at: "2026-11-02T03:00:00.000Z" }),
      appt({ appointment_id: 2, start_at: "2026-11-02T01:00:00.000Z" }),
      appt({ appointment_id: 3, start_at: "2026-11-01T23:00:00.000Z" }), // Nov 2, 7:00 AM Manila
    ]);
    expect(ids(days.get("2026-11-02") ?? [])).toEqual([3, 2, 1]);
  });
});
