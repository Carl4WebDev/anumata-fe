import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import AppointmentsCalendar from "./AppointmentsCalendar";
import { appointmentsApi, type Appointment } from "../../../shared/api/appointmentsApi";

vi.mock("../../../shared/api/appointmentsApi", () => ({
  appointmentsApi: { list: vi.fn() },
}));

vi.mock("../../context/patients/usePatients", () => ({
  usePatients: () => ({
    patients: [
      { id: 9, name: "MARIA SANTOS" },
      { id: 7, name: "ANA REYES" },
    ],
  }),
}));

const api = vi.mocked(appointmentsApi);

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

const NOVEMBER = [
  appt({ appointment_id: 1, patient_id: 9, patient_name: "MARIA SANTOS", status: "completed", start_at: "2026-11-02T01:00:00.000Z" }),
  appt({ appointment_id: 2, patient_id: 7, patient_name: "ANA REYES", status: "no_show", start_at: "2026-11-02T03:00:00.000Z" }),
  appt({ appointment_id: 3, patient_id: 9, patient_name: "MARIA SANTOS", status: "cancelled", start_at: "2026-11-05T02:00:00.000Z" }),
  appt({ appointment_id: 4, patient_id: 7, patient_name: "ANA REYES", status: "scheduled", start_at: "2026-11-20T01:00:00.000Z" }),
];

function renderCalendar() {
  return render(
    <MemoryRouter>
      <AppointmentsCalendar version={1} onEdit={vi.fn()} onCancel={vi.fn()} onQuickAction={vi.fn()} />
    </MemoryRouter>,
  );
}

/** Patient names of the cards in the list below the grid, in order. */
function listedNames() {
  const list = screen.getByRole("heading", { level: 2, name: /All of|day,/ }).closest("section")!;
  return within(list)
    .getAllByRole("link")
    .map((l) => l.textContent);
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-15T04:00:00.000Z"));
  vi.clearAllMocks();
  api.list.mockResolvedValue(NOVEMBER);
});

afterEach(() => vi.useRealTimers());

describe("AppointmentsCalendar", () => {
  test("loads the current Manila month and places appointments on their days", async () => {
    renderCalendar();
    expect(await screen.findByText("November 2026")).toBeInTheDocument();
    expect(api.list).toHaveBeenCalledWith({ from: "2026-10-31T16:00:00.000Z", to: "2026-11-30T16:00:00.000Z" });

    const nov2 = await screen.findByRole("button", { name: /Monday, November 2, 2 appointments/ });
    expect(within(nov2).getByText(/MARIA SANTOS/)).toBeInTheDocument();
    expect(within(nov2).getByText(/ANA REYES/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Thursday, November 5, 1 appointment$/ })).toBeInTheDocument();
  });

  test("filters by patient", async () => {
    const user = userEvent.setup();
    renderCalendar();
    await screen.findByRole("button", { name: /November 2, 2 appointments/ });
    await user.selectOptions(screen.getByLabelText("Filter by patient"), "9");
    expect(screen.getByRole("button", { name: /November 2, 1 appointment$/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /November 20, 0 appointments/ })).toBeInTheDocument();
    expect(listedNames()).toEqual(["MARIA SANTOS", "MARIA SANTOS"]);
  });

  test("'Done only' hides scheduled appointments", async () => {
    const user = userEvent.setup();
    renderCalendar();
    await screen.findByRole("button", { name: /November 20, 1 appointment$/ });
    await user.click(screen.getByRole("button", { name: "Done only" }));
    expect(screen.getByRole("button", { name: /November 20, 0 appointments/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Scheduled" })).toHaveAttribute("aria-pressed", "false");
  });

  test("status chips toggle individually", async () => {
    const user = userEvent.setup();
    renderCalendar();
    await screen.findByRole("button", { name: /November 2, 2 appointments/ });
    await user.click(screen.getByRole("button", { name: "No-show" }));
    expect(screen.getByRole("button", { name: /November 2, 1 appointment$/ })).toBeInTheDocument();
  });

  test("clicking a day lists that day, sorted as chosen", async () => {
    const user = userEvent.setup();
    renderCalendar();
    await user.click(await screen.findByRole("button", { name: /November 2, 2 appointments/ }));
    expect(screen.getByRole("heading", { name: "Monday, November 2" })).toBeInTheDocument();
    expect(listedNames()).toEqual(["MARIA SANTOS", "ANA REYES"]); // by time
    await user.selectOptions(screen.getByLabelText("Sort by"), "patient");
    expect(listedNames()).toEqual(["ANA REYES", "MARIA SANTOS"]);
    await user.click(screen.getByRole("button", { name: /Show whole month/ }));
    expect(listedNames()).toHaveLength(4);
  });

  test("month navigation fetches the next month", async () => {
    const user = userEvent.setup();
    renderCalendar();
    await screen.findByText("November 2026");
    api.list.mockResolvedValue([]);
    await user.click(screen.getByRole("button", { name: "Next month" }));
    expect(await screen.findByText("December 2026")).toBeInTheDocument();
    expect(api.list).toHaveBeenLastCalledWith({ from: "2026-11-30T16:00:00.000Z", to: "2026-12-31T16:00:00.000Z" });
    expect(await screen.findByText("No appointments match these filters.")).toBeInTheDocument();
  });
});
