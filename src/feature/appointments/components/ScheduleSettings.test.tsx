import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ScheduleSettings from "./ScheduleSettings";
import { appointmentsApi, type Schedule } from "../../../shared/api/appointmentsApi";
import { ApiError } from "../../../shared/api/httpClient";

vi.mock("../../../shared/api/appointmentsApi", () => ({
  appointmentsApi: { setAvailability: vi.fn(), addUnavailable: vi.fn(), removeUnavailable: vi.fn(), updateSettings: vi.fn() },
}));
const toast = { success: vi.fn(), error: vi.fn(), info: vi.fn(), toast: vi.fn() };
vi.mock("../../../shared/context/ToastContext", () => ({ useToast: () => toast }));

const api = vi.mocked(appointmentsApi);
// No hours yet, so the panel starts open on "Working hours".
const schedule: Schedule = { settings: { therapist_id: 1, slot_minutes: 60 }, availability: [], unavailable: [] } as unknown as Schedule;

const conflictError = () =>
  new ApiError("1 appointment would fall outside these working hours.", 409, "SCHEDULE_CONFLICT", {
    conflicts: [{ appointment_id: 7, patient_name: "ANA CRUZ", start_at: "2026-11-09T02:00:00.000Z", end_at: "2026-11-09T03:00:00.000Z" }],
  });

beforeEach(() => vi.clearAllMocks());

describe("ScheduleSettings — changes that clash with booked appointments", () => {
  test("lists the affected appointments; 'Save anyway' saves with confirmation", async () => {
    api.setAvailability.mockRejectedValueOnce(conflictError()).mockResolvedValueOnce([]);
    const onChanged = vi.fn().mockResolvedValue(undefined);
    render(<ScheduleSettings schedule={schedule} onChanged={onChanged} />);

    fireEvent.click(screen.getByRole("button", { name: /Save working hours/ }));
    const warning = await screen.findByRole("alert");
    expect(warning).toHaveTextContent("1 appointment would fall outside these working hours.");
    expect(warning).toHaveTextContent("ANA CRUZ");
    expect(api.setAvailability).toHaveBeenLastCalledWith([], false);
    expect(onChanged).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled(); // a question, not an error

    fireEvent.click(screen.getByRole("button", { name: "Save anyway" }));
    await waitFor(() => expect(api.setAvailability).toHaveBeenLastCalledWith([], true));
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
    expect(toast.success).toHaveBeenCalledWith("Working hours saved");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  test("'Go back' saves nothing", async () => {
    api.setAvailability.mockRejectedValueOnce(conflictError());
    render(<ScheduleSettings schedule={schedule} onChanged={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /Save working hours/ }));
    await screen.findByRole("alert");
    fireEvent.click(screen.getByRole("button", { name: "Go back" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(api.setAvailability).toHaveBeenCalledTimes(1);
  });

  test("other errors still show as an error message", async () => {
    api.setAvailability.mockRejectedValueOnce(new ApiError("Working hours on the same day must not overlap.", 422, "VALIDATION_ERROR"));
    render(<ScheduleSettings schedule={schedule} onChanged={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /Save working hours/ }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Working hours on the same day must not overlap."));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
