import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SessionLengthEditor, SessionTypesEditor } from "./SessionSettings";
import { appointmentsApi, type Schedule } from "../../../shared/api/appointmentsApi";

vi.mock("../../../shared/api/appointmentsApi", () => ({
  appointmentsApi: {
    updateSettings: vi.fn(),
    createSessionType: vi.fn(),
    updateSessionType: vi.fn(),
    removeSessionType: vi.fn(),
  },
}));
const toast = { success: vi.fn(), error: vi.fn(), info: vi.fn(), toast: vi.fn() };
vi.mock("../../../shared/context/ToastContext", () => ({ useToast: () => toast }));

const api = vi.mocked(appointmentsApi);
const consultation = { session_type_id: 7, name: "Consultation", duration_minutes: 30 };
const schedule = (overrides: Partial<Schedule> = {}): Schedule => ({
  settings: { therapist_id: 1, slot_minutes: 60, break_minutes: 0 },
  availability: [],
  unavailable: [],
  session_types: [],
  ...overrides,
});

beforeEach(() => vi.clearAllMocks());

describe("SessionTypesEditor", () => {
  test("adds a type with a name and length", async () => {
    api.createSessionType.mockResolvedValue(consultation);
    const onChanged = vi.fn().mockResolvedValue(undefined);
    render(<SessionTypesEditor schedule={schedule()} onChanged={onChanged} />);

    expect(screen.getByText(/No session types yet/)).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("e.g. Consultation"), { target: { value: " Consultation " } });
    fireEvent.change(screen.getByLabelText("Length"), { target: { value: "30" } });
    fireEvent.click(screen.getByRole("button", { name: /Add/ }));

    await waitFor(() => expect(api.createSessionType).toHaveBeenCalledWith({ name: "Consultation", duration_minutes: 30 }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Session type added"));
    expect(onChanged).toHaveBeenCalled();
  });

  test("a type needs a name", () => {
    render(<SessionTypesEditor schedule={schedule()} onChanged={vi.fn()} />);
    expect(screen.getByRole("button", { name: /Add/ })).toBeDisabled();
  });

  test("edits a type's length", async () => {
    api.updateSessionType.mockResolvedValue({ ...consultation, duration_minutes: 45 });
    render(<SessionTypesEditor schedule={schedule({ session_types: [consultation] })} onChanged={vi.fn().mockResolvedValue(undefined)} />);

    expect(screen.getByText("Consultation")).toBeInTheDocument();
    expect(screen.getByText("30 min", { selector: "span" })).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Edit Consultation"));
    fireEvent.change(screen.getByLabelText("Session type length"), { target: { value: "45" } });
    fireEvent.click(screen.getByLabelText("Save session type"));

    await waitFor(() => expect(api.updateSessionType).toHaveBeenCalledWith(7, { name: "Consultation", duration_minutes: 45 }));
  });

  test("removes a type", async () => {
    api.removeSessionType.mockResolvedValue({ removed: true });
    render(<SessionTypesEditor schedule={schedule({ session_types: [consultation] })} onChanged={vi.fn().mockResolvedValue(undefined)} />);
    fireEvent.click(screen.getByLabelText("Remove Consultation"));
    await waitFor(() => expect(api.removeSessionType).toHaveBeenCalledWith(7));
  });

  test("a duplicate name shows the server's message", async () => {
    api.createSessionType.mockRejectedValue(new Error("You already have a session type with this name."));
    render(<SessionTypesEditor schedule={schedule({ session_types: [consultation] })} onChanged={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText("e.g. Consultation"), { target: { value: "consultation" } });
    fireEvent.click(screen.getByRole("button", { name: /Add/ }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("You already have a session type with this name."));
  });
});

describe("SessionLengthEditor", () => {
  test("saves the default length and the break after each session", async () => {
    api.updateSettings.mockResolvedValue({ therapist_id: 1, slot_minutes: 50, break_minutes: 10 });
    render(<SessionLengthEditor schedule={schedule()} onChanged={vi.fn().mockResolvedValue(undefined)} />);

    const save = screen.getByRole("button", { name: /Save/ });
    expect(save).toBeDisabled(); // nothing changed yet
    fireEvent.change(screen.getByLabelText("Default session length"), { target: { value: "50" } });
    fireEvent.change(screen.getByLabelText("Break after each session"), { target: { value: "10" } });
    fireEvent.click(save);

    await waitFor(() => expect(api.updateSettings).toHaveBeenCalledWith({ slot_minutes: 50, break_minutes: 10 }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Session settings saved"));
  });

  test("offers no break up to 30 minutes", () => {
    render(<SessionLengthEditor schedule={schedule()} onChanged={vi.fn()} />);
    const options = Array.from((screen.getByLabelText("Break after each session") as HTMLSelectElement).options).map((o) => o.text);
    expect(options).toEqual(["No break", "5 min", "10 min", "15 min", "20 min", "30 min"]);
  });
});
