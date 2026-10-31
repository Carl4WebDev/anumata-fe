import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import AppointmentFormModal from "./AppointmentFormModal";
import { appointmentsApi, type Appointment } from "../../../shared/api/appointmentsApi";

vi.mock("../../../shared/api/appointmentsApi", () => ({
  appointmentsApi: { freeSlots: vi.fn(), book: vi.fn(), update: vi.fn() },
}));

const addPatient = vi.fn();
vi.mock("../../context/patients/usePatients", () => ({
  usePatients: () => ({
    patients: [
      { id: 9, name: "MARIA SANTOS", isArchived: false },
      { id: 10, name: "OLD PATIENT", isArchived: true },
    ],
    addPatient,
  }),
}));

const api = vi.mocked(appointmentsApi);
const SLOT_9 = "2026-11-02T01:00:00.000Z"; // 9:00 AM Manila
const SLOT_10 = "2026-11-02T02:00:00.000Z"; // 10:00 AM Manila

function renderModal(mode: Parameters<typeof AppointmentFormModal>[0]["mode"], onSaved = vi.fn()) {
  render(
    <MemoryRouter>
      <AppointmentFormModal mode={mode} onClose={vi.fn()} onSaved={onSaved} />
    </MemoryRouter>,
  );
  return onSaved;
}

beforeEach(() => {
  vi.clearAllMocks();
  api.freeSlots.mockResolvedValue({ date: "2026-11-02", slot_minutes: 60, slots: [SLOT_9, SLOT_10] });
});

describe("AppointmentFormModal — booking", () => {
  test("books the chosen patient into the chosen free slot", async () => {
    const user = userEvent.setup();
    api.book.mockResolvedValue({} as Appointment);
    const onSaved = renderModal({ kind: "book" });

    // Archived patients are not offered.
    expect(screen.queryByText("OLD PATIENT")).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Patient"), "9");
    await user.click(await screen.findByRole("button", { name: /10:00\s?AM/ }));
    await user.selectOptions(screen.getByLabelText("Reason"), "Initial consultation");
    await user.click(screen.getByRole("button", { name: "Book appointment" }));

    expect(api.book).toHaveBeenCalledWith({ patient_id: 9, start_at: SLOT_10, reason: "Initial consultation" });
    expect(onSaved).toHaveBeenCalledWith("Appointment booked");
  });

  test("reason can be typed when it's not in the list", async () => {
    const user = userEvent.setup();
    api.book.mockResolvedValue({} as Appointment);
    renderModal({ kind: "book", patientId: 9 });
    await user.click(await screen.findByRole("button", { name: /9:00\s?AM/ }));
    await user.selectOptions(screen.getByLabelText("Reason"), "Other (type your own)…");
    await user.type(screen.getByLabelText("Reason (custom)"), "Couples session");
    await user.click(screen.getByRole("button", { name: "Book appointment" }));
    expect(api.book).toHaveBeenCalledWith(expect.objectContaining({ reason: "Couples session" }));
  });

  test("cannot book until patient and time are chosen", async () => {
    const user = userEvent.setup();
    renderModal({ kind: "book" });
    const submit = screen.getByRole("button", { name: "Book appointment" });
    expect(submit).toBeDisabled();
    await user.click(await screen.findByRole("button", { name: /9:00\s?AM/ }));
    expect(submit).toBeDisabled(); // still no patient
  });

  test("explains an empty day", async () => {
    api.freeSlots.mockResolvedValue({ date: "2026-11-02", slot_minutes: 60, slots: [] });
    renderModal({ kind: "book" });
    expect(await screen.findByText(/No free times on this day/)).toBeInTheDocument();
  });

  test("shows the server's error, e.g. slot just taken", async () => {
    const user = userEvent.setup();
    api.book.mockRejectedValue(new Error("That time is already booked."));
    const onSaved = renderModal({ kind: "book", patientId: 9 });
    await user.click(await screen.findByRole("button", { name: /9:00\s?AM/ }));
    await user.click(screen.getByRole("button", { name: "Book appointment" }));
    expect(await screen.findByText("That time is already booked.")).toBeInTheDocument();
    expect(onSaved).not.toHaveBeenCalled();
  });
});

describe("AppointmentFormModal — new patient", () => {
  async function fillNewPatient(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole("button", { name: /New patient/ }));
    await user.type(screen.getByLabelText("First name"), "Juan");
    await user.type(screen.getByLabelText("Last name"), "Dela Cruz");
    await user.selectOptions(screen.getByLabelText("Age"), "29");
    await user.selectOptions(screen.getByLabelText("Gender"), "male");
    await user.selectOptions(screen.getByLabelText("Primary concern"), "Anxiety");
    await user.click(await screen.findByRole("button", { name: /9:00\s?AM/ }));
  }

  test("creates the patient record, then books it", async () => {
    const user = userEvent.setup();
    addPatient.mockResolvedValue({ ok: true, data: { id: 42 } });
    api.book.mockResolvedValue({} as Appointment);
    const onSaved = renderModal({ kind: "book" });

    await fillNewPatient(user);
    const submit = screen.getByRole("button", { name: "Book appointment" });
    expect(submit).toBeEnabled();
    await user.click(submit);

    expect(addPatient).toHaveBeenCalledWith({
      f_name: "Juan",
      m_name: undefined,
      l_name: "Dela Cruz",
      age: 29,
      gender: "male",
      concern: "Anxiety",
    });
    expect(api.book).toHaveBeenCalledWith(expect.objectContaining({ patient_id: 42, start_at: SLOT_9 }));
    expect(onSaved).toHaveBeenCalledWith("Patient added and appointment booked");
  });

  test("needs all required patient fields", async () => {
    const user = userEvent.setup();
    renderModal({ kind: "book" });
    await user.click(screen.getByRole("button", { name: /New patient/ }));
    await user.type(screen.getByLabelText("First name"), "Juan");
    await user.click(await screen.findByRole("button", { name: /9:00\s?AM/ }));
    expect(screen.getByRole("button", { name: "Book appointment" })).toBeDisabled();
  });

  test("a duplicate patient is reported and nothing is booked", async () => {
    const user = userEvent.setup();
    addPatient.mockResolvedValue({ ok: false, error: "This patient already exists." });
    renderModal({ kind: "book" });
    await fillNewPatient(user);
    await user.click(screen.getByRole("button", { name: "Book appointment" }));
    expect(await screen.findByText("This patient already exists.")).toBeInTheDocument();
    expect(api.book).not.toHaveBeenCalled();
  });

  test("if booking fails after creating the patient, a retry doesn't create them again", async () => {
    const user = userEvent.setup();
    addPatient.mockResolvedValue({ ok: true, data: { id: 42 } });
    api.book.mockRejectedValueOnce(new Error("That time is already booked.")).mockResolvedValueOnce({} as Appointment);
    const onSaved = renderModal({ kind: "book" });
    await fillNewPatient(user);
    await user.click(screen.getByRole("button", { name: "Book appointment" }));
    expect(await screen.findByText(/patient record was created, but the booking failed/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Book appointment" }));
    expect(addPatient).toHaveBeenCalledTimes(1);
    expect(api.book).toHaveBeenLastCalledWith(expect.objectContaining({ patient_id: 42 }));
    expect(onSaved).toHaveBeenCalledWith("Appointment booked");
  });
});

describe("AppointmentFormModal — booking from a follow-up", () => {
  test("pre-fills patient, recommended day and note, and links the follow-up", async () => {
    const user = userEvent.setup();
    api.book.mockResolvedValue({} as Appointment);
    const onSaved = renderModal({
      kind: "book",
      patientId: 9,
      // DATE columns arrive as midnight Manila serialized in UTC.
      followUp: { id: 3, recommendedDate: "2026-11-01T16:00:00.000Z", reason: "Check sleep" },
    });

    expect(screen.getByText("MARIA SANTOS")).toBeInTheDocument();
    expect(screen.queryByLabelText("Patient")).not.toBeInTheDocument(); // patient is fixed
    expect(api.freeSlots).toHaveBeenCalledWith("2026-11-02", undefined);
    expect(screen.getByDisplayValue("Check sleep")).toBeInTheDocument();

    await user.click(await screen.findByRole("button", { name: /9:00\s?AM/ }));
    await user.click(screen.getByRole("button", { name: "Book appointment" }));
    expect(api.book).toHaveBeenCalledWith({ patient_id: 9, start_at: SLOT_9, reason: "Check sleep", follow_up_id: 3 });
    expect(onSaved).toHaveBeenCalled();
  });
});

describe("AppointmentFormModal — editing", () => {
  const appt = {
    appointment_id: 5,
    patient_id: 9,
    patient_name: "MARIA SANTOS",
    status: "scheduled",
    start_at: SLOT_9,
    end_at: SLOT_10,
    reason: "Intake",
  } as Appointment;

  test("moves the appointment, asking for slots that include its own", async () => {
    const user = userEvent.setup();
    api.update.mockResolvedValue(appt);
    const onSaved = renderModal({ kind: "edit", appt });

    expect(api.freeSlots).toHaveBeenCalledWith("2026-11-02", 5);
    expect(await screen.findByText("(current)")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /10:00\s?AM/ }));
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(api.update).toHaveBeenCalledWith(5, { start_at: SLOT_10 });
    expect(onSaved).toHaveBeenCalledWith("Appointment moved");
  });

  test("editing only the reason sends only the reason", async () => {
    const user = userEvent.setup();
    api.update.mockResolvedValue(appt);
    renderModal({ kind: "edit", appt });
    const reason = await screen.findByDisplayValue("Intake");
    await user.clear(reason);
    await user.type(reason, "Sleep follow-up");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(api.update).toHaveBeenCalledWith(5, { reason: "Sleep follow-up" });
  });
});
