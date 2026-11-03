import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PreSessionInterview from "./PreSessionInterview";
import type { Appointment, AppointmentInterview } from "../../../shared/api/appointmentsApi";

const generateLink = vi.fn();
vi.mock("../../context/interviewLinks/useInterviewLinks", () => ({
  useInterviewLinks: () => ({ generateLink }),
}));
const toast = { success: vi.fn(), error: vi.fn(), info: vi.fn(), toast: vi.fn() };
vi.mock("../../../shared/context/ToastContext", () => ({ useToast: () => toast }));
// The real modal needs the patient / question-set providers; a stub that "generates" is enough here.
vi.mock("../../interviewLinks/modals/GenerateLinkModal", () => ({
  default: ({ isOpen, onGenerate, defaultPatientId }: { isOpen: boolean; onGenerate: (d: unknown) => Promise<unknown>; defaultPatientId?: number }) =>
    isOpen ? (
      <button onClick={() => void onGenerate({ patientId: defaultPatientId, patientName: "MARIA", questionSetId: 1, templateName: "Intake" })}>
        Generate for patient {defaultPatientId}
      </button>
    ) : null,
}));

const FUTURE = new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString();
const PAST = new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString();

function appt(interview: AppointmentInterview | null, overrides: Partial<Appointment> = {}): Appointment {
  return {
    appointment_id: 4,
    therapist_id: 3,
    patient_id: 9,
    patient_name: "MARIA SANTOS",
    follow_up_id: null,
    status: "scheduled",
    start_at: FUTURE,
    end_at: FUTURE,
    reason: null,
    cancel_reason: null,
    created_at: PAST,
    updated_at: PAST,
    interview,
    ...overrides,
  };
}

const interview = (overrides: Partial<AppointmentInterview> = {}): AppointmentInterview => ({
  interview_link_id: 12,
  token: "tok-123",
  status: "pending",
  created_at: PAST,
  session_id: null,
  risk_level: null,
  spike_count: 0,
  crisis: false,
  ...overrides,
});

const onQuickAction = vi.fn(async (fn: () => Promise<unknown>) => {
  await fn();
});

function renderLine(a: Appointment) {
  return render(
    <MemoryRouter>
      <PreSessionInterview appt={a} onQuickAction={onQuickAction} />
    </MemoryRouter>,
  );
}

beforeEach(() => vi.clearAllMocks());

describe("PreSessionInterview", () => {
  test("upcoming, no interview: offers to send one for this patient, then refreshes", async () => {
    generateLink.mockResolvedValue({ ok: true, data: { token: "new-tok" } });
    renderLine(appt(null));
    expect(screen.getByText(/No pre-session interview yet/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Send interview/ }));
    fireEvent.click(screen.getByRole("button", { name: "Generate for patient 9" }));
    await waitFor(() => expect(generateLink).toHaveBeenCalledWith(expect.objectContaining({ patientId: 9 })));
    await waitFor(() => expect(onQuickAction).toHaveBeenCalledWith(expect.any(Function), "Pre-session interview created"));
  });

  test("sent, not done yet: copy the patient's link", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    renderLine(appt(interview({ status: "pending" })));
    expect(screen.getByText(/Interview sent — not done yet/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Copy link/ }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/interview/tok-123`));
    expect(toast.success).toHaveBeenCalled();
  });

  test("done: risk, spikes, crisis flag, and a link to the results", () => {
    renderLine(appt(interview({ status: "completed", session_id: 31, risk_level: "Moderate", spike_count: 2, crisis: true })));
    expect(screen.getByText(/Interview done/)).toBeInTheDocument();
    expect(screen.getByText(/Moderate risk/)).toBeInTheDocument();
    expect(screen.getByText(/2 spikes/)).toBeInTheDocument();
    expect(screen.getByText(/Crisis flag/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /View results/ })).toHaveAttribute("href", "/sessions/31");
  });

  test("finished but the analysis isn't ready yet", () => {
    renderLine(appt(interview({ status: "completed", session_id: null })));
    expect(screen.getByText(/results not ready yet/)).toBeInTheDocument();
  });

  test("expired link: a new one can be sent", () => {
    renderLine(appt(interview({ status: "expired" })));
    expect(screen.getByText(/link expired/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Send interview/ })).toBeInTheDocument();
  });

  test("past appointment without an interview: nothing to show", () => {
    const { container } = renderLine(appt(null, { status: "completed", start_at: PAST }));
    expect(container).toBeEmptyDOMElement();
  });
});
