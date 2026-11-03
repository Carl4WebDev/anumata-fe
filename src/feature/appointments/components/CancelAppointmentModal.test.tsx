import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import CancelAppointmentModal from "./CancelAppointmentModal";
import { appointmentsApi, type Appointment } from "../../../shared/api/appointmentsApi";

vi.mock("../../../shared/api/appointmentsApi", () => ({ appointmentsApi: { cancel: vi.fn() } }));
const api = vi.mocked(appointmentsApi);

const appt = (overrides: Partial<Appointment> = {}) =>
  ({
    appointment_id: 5,
    patient_id: 9,
    patient_name: "ANA CRUZ",
    status: "scheduled",
    start_at: "2026-11-16T01:00:00.000Z",
    end_at: "2026-11-16T02:00:00.000Z",
    ...overrides,
  }) as Appointment;

beforeEach(() => vi.clearAllMocks());

describe("CancelAppointmentModal", () => {
  test("a single appointment: no series choice, cancels just it", async () => {
    api.cancel.mockResolvedValue(appt({ status: "cancelled" }));
    const onSaved = vi.fn();
    render(<CancelAppointmentModal appt={appt()} onClose={vi.fn()} onSaved={onSaved} />);
    expect(screen.queryByText(/recurring series/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel appointment" }));
    await waitFor(() => expect(api.cancel).toHaveBeenCalledWith(5, undefined, "one"));
    expect(onSaved).toHaveBeenCalledWith("Appointment cancelled");
  });

  test("a series session: can cancel this and all following sessions", async () => {
    api.cancel.mockResolvedValue({ cancelled: 6 });
    const onSaved = vi.fn();
    render(
      <CancelAppointmentModal appt={appt({ series_id: "s-1", series_index: 3, series_total: 8 })} onClose={vi.fn()} onSaved={onSaved} />,
    );
    expect(screen.getByText(/session 3 of 8/)).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("This and all following sessions"));
    fireEvent.click(screen.getByRole("button", { name: "Cancel appointment" }));
    await waitFor(() => expect(api.cancel).toHaveBeenCalledWith(5, undefined, "following"));
    expect(onSaved).toHaveBeenCalledWith("6 sessions cancelled");
  });

  test("the last session of a series offers no 'following' choice", () => {
    render(<CancelAppointmentModal appt={appt({ series_id: "s-1", series_index: 8, series_total: 8 })} onClose={vi.fn()} onSaved={vi.fn()} />);
    expect(screen.queryByLabelText("This and all following sessions")).not.toBeInTheDocument();
  });
});
