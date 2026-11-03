import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AppointmentCard from "./AppointmentCard";
import type { Appointment } from "../../../shared/api/appointmentsApi";

// The card's pre-session interview line uses these app-wide providers.
vi.mock("../../context/interviewLinks/useInterviewLinks", () => ({ useInterviewLinks: () => ({ generateLink: vi.fn() }) }));
vi.mock("../../../shared/context/ToastContext", () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn(), toast: vi.fn() }),
}));

const FUTURE = new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString();
const base = {
  appointment_id: 5,
  therapist_id: 1,
  patient_id: 9,
  patient_name: "ANA CRUZ",
  follow_up_id: null,
  status: "scheduled",
  start_at: FUTURE,
  end_at: FUTURE,
  reason: null,
  cancel_reason: null,
  created_at: FUTURE,
  updated_at: FUTURE,
  interview: null,
} as Appointment;

const renderCard = (appt: Appointment) =>
  render(
    <MemoryRouter>
      <AppointmentCard appt={appt} onEdit={vi.fn()} onCancel={vi.fn()} onQuickAction={vi.fn()} />
    </MemoryRouter>,
  );

describe("AppointmentCard — undo an outcome", () => {
  test("a just-completed appointment offers Undo, which reopens it", () => {
    const onQuickAction = vi.fn();
    render(
      <MemoryRouter>
        <AppointmentCard appt={{ ...base, status: "completed", updated_at: new Date().toISOString() }} onEdit={vi.fn()} onCancel={vi.fn()} onQuickAction={onQuickAction} />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: /Undo completed/ }));
    expect(onQuickAction).toHaveBeenCalledWith(expect.any(Function), "Undone — the appointment is scheduled again");
  });

  test("a cancelled appointment can be undone too", () => {
    renderCard({ ...base, status: "cancelled", updated_at: new Date().toISOString() });
    expect(screen.getByRole("button", { name: /Undo cancelled/ })).toBeInTheDocument();
  });

  test("after 15 minutes there is no Undo", () => {
    renderCard({ ...base, status: "no_show", updated_at: new Date(Date.now() - 16 * 60000).toISOString() });
    expect(screen.queryByRole("button", { name: /Undo/ })).not.toBeInTheDocument();
  });

  test("a scheduled appointment has no Undo", () => {
    renderCard(base);
    expect(screen.queryByRole("button", { name: /Undo/ })).not.toBeInTheDocument();
  });
});

describe("AppointmentCard — session type and length", () => {
  test("shows the type it was booked as and how long it is", () => {
    renderCard({ ...base, start_at: "2026-11-16T01:00:00.000Z", end_at: "2026-11-16T01:30:00.000Z", session_type: "Consultation" });
    expect(screen.getByText(/· Consultation · 30 min/)).toBeInTheDocument();
  });

  test("without a type it still shows the length", () => {
    renderCard({ ...base, start_at: "2026-11-16T01:00:00.000Z", end_at: "2026-11-16T02:30:00.000Z" });
    expect(screen.getByText(/· 1 hr 30 min/)).toBeInTheDocument();
  });
});

describe("AppointmentCard — recurring series", () => {
  test("shows the session's place in its series", () => {
    renderCard({ ...base, series_id: "s-1", series_index: 3, series_total: 8 });
    expect(screen.getByText("Session 3 of 8")).toBeInTheDocument();
  });

  test("a single appointment shows no series badge", () => {
    renderCard(base);
    expect(screen.queryByText(/Session \d+ of/)).not.toBeInTheDocument();
  });
});

describe("AppointmentCard — reminder emails", () => {
  beforeEach(() => vi.stubEnv("VITE_REMINDER_EMAILS", "true"));
  afterEach(() => vi.unstubAllEnvs());

  test("shows when a reminder email went out to the patient", () => {
    renderCard({ ...base, reminders: [{ kind: "day_before", status: "sent", sent_at: FUTURE }] });
    expect(screen.getByText("Reminder emailed")).toBeInTheDocument();
  });

  test("hidden while reminder emails are off", () => {
    vi.stubEnv("VITE_REMINDER_EMAILS", "false");
    renderCard({ ...base, reminders: [{ kind: "day_before", status: "sent", sent_at: FUTURE }] });
    expect(screen.queryByText("Reminder emailed")).not.toBeInTheDocument();
  });

  test("a failed or pending reminder doesn't count", () => {
    renderCard({ ...base, reminders: [{ kind: "day_before", status: "failed", sent_at: FUTURE }] });
    expect(screen.queryByText("Reminder emailed")).not.toBeInTheDocument();
  });
});
