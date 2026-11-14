import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import AppointmentFormModal from "./AppointmentFormModal";
import { appointmentsApi, type Appointment, type Schedule } from "../../../shared/api/appointmentsApi";
import { ApiError } from "../../../shared/api/httpClient";

// Some tests type into many fields; under a full test run that can take over 5s.
vi.setConfig({ testTimeout: 20_000 });

vi.mock("../../../shared/api/appointmentsApi", () => ({
  appointmentsApi: { freeSlots: vi.fn(), book: vi.fn(), update: vi.fn(), getSchedule: vi.fn() },
}));

const addPatient = vi.fn();
vi.mock("../../context/patients/usePatients", () => ({
  usePatients: () => ({
    patients: [
      { id: 9, name: "MARIA SANTOS", isArchived: false, contactNumber: "+639171234567", email: "maria@gmail.com", reminderConsent: true },
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
  // "Today" is Monday 2 Nov 2026, 7:00 AM Manila, so the form opens on the day these tests book.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-01T23:00:00.000Z"));
  api.freeSlots.mockResolvedValue({ date: "2026-11-02", slot_minutes: 60, break_minutes: 0, slots: [SLOT_9, SLOT_10] });
  api.getSchedule.mockResolvedValue({ session_types: [] } as unknown as Schedule);
});
afterEach(() => vi.useRealTimers());

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
    expect(onSaved).toHaveBeenCalledWith(expect.stringMatching(/^Appointment booked for Nov 2, 10:00\sAM\.$/));
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
    api.freeSlots.mockResolvedValue({ date: "2026-11-02", slot_minutes: 60, break_minutes: 0, slots: [] });
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
      reminder_consent: false,
    });
    expect(api.book).toHaveBeenCalledWith(expect.objectContaining({ patient_id: 42, start_at: SLOT_9 }));
    expect(onSaved).toHaveBeenCalledWith(expect.stringMatching(/^Patient added and appointment booked for Nov 2, 9:00\sAM\.$/));
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
    expect(onSaved).toHaveBeenCalledWith(expect.stringMatching(/^Appointment booked for Nov 2, /));
  });
});

describe("AppointmentFormModal — session types", () => {
  const types = [
    { session_type_id: 7, name: "Consultation", duration_minutes: 30 },
    { session_type_id: 8, name: "Initial assessment", duration_minutes: 90 },
  ];

  test("choosing a type fetches free times for its length and books with it", async () => {
    const user = userEvent.setup();
    api.getSchedule.mockResolvedValue({ session_types: types } as unknown as Schedule);
    api.book.mockResolvedValue({} as Appointment);
    const onSaved = renderModal({ kind: "book" });

    await user.selectOptions(screen.getByLabelText("Patient"), "9");
    const typeSelect = await screen.findByLabelText("Session type");
    expect(typeSelect).toHaveTextContent("Initial assessment · 1 hr 30 min");

    api.freeSlots.mockResolvedValue({ date: "2026-11-02", slot_minutes: 90, break_minutes: 0, slots: [SLOT_9] });
    await user.selectOptions(typeSelect, "8");
    expect(api.freeSlots).toHaveBeenLastCalledWith("2026-11-02", undefined, 8);
    expect(await screen.findByText(/1 hr 30 min each/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /9:00\s?AM/ }));
    await user.click(screen.getByRole("button", { name: "Book appointment" }));
    expect(api.book).toHaveBeenCalledWith({ patient_id: 9, start_at: SLOT_9, session_type_id: 8 });
    expect(onSaved).toHaveBeenCalledWith(expect.stringMatching(/^Appointment booked for Nov 2, 9:00\sAM\.$/));
  });

  test("with no session types there is no type choice", async () => {
    renderModal({ kind: "book" });
    await screen.findByRole("button", { name: /9:00\s?AM/ });
    expect(screen.queryByLabelText("Session type")).not.toBeInTheDocument();
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
    expect(api.freeSlots).toHaveBeenCalledWith("2026-11-02", undefined, undefined);
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

    expect(api.freeSlots).toHaveBeenCalledWith("2026-11-02", 5, undefined);
    expect(await screen.findByText("(current)")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /10:00\s?AM/ }));
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(api.update).toHaveBeenCalledWith(5, { start_at: SLOT_10 });
    expect(onSaved).toHaveBeenCalledWith(expect.stringMatching(/^Appointment moved to Nov 2, 10:00\sAM\.$/));
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

describe("AppointmentFormModal — recurring series", () => {
  test("weekly for 4 sessions: sends the series, shows a summary, and reports how many were booked", async () => {
    const user = userEvent.setup();
    api.book.mockResolvedValue({ appointments: [{}, {}, {}, {}] as Appointment[], skipped: [] });
    const onSaved = renderModal({ kind: "book" });

    await user.selectOptions(screen.getByLabelText("Patient"), "9");
    await user.click(await screen.findByRole("button", { name: /9:00\s?AM/ }));
    await user.selectOptions(screen.getByLabelText("Repeat"), "1");
    await user.selectOptions(screen.getByLabelText("Number of sessions"), "4");
    expect(screen.getByText(/4 sessions, Mondays at 9:00\s?AM, until Monday, November 23/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Book 4 sessions" }));
    expect(api.book).toHaveBeenCalledWith({
      patient_id: 9,
      start_at: SLOT_9,
      repeat: { every_weeks: 1, count: 4 },
      skip_unavailable: false,
    });
    expect(onSaved).toHaveBeenCalledWith(expect.stringMatching(/^4 sessions booked, starting Nov 2, 9:00\sAM\.$/));
  });

  test("some dates taken: lists them, and 'Book the other …' books the rest", async () => {
    const user = userEvent.setup();
    const taken = "2026-11-16T01:00:00.000Z";
    api.book
      .mockRejectedValueOnce(new ApiError("1 of the 4 dates isn't free.", 409, "RECURRENCE_CONFLICT", { unavailable: [taken], available_count: 3 }))
      .mockResolvedValueOnce({ appointments: [{}, {}, {}] as Appointment[], skipped: [taken] });
    const onSaved = renderModal({ kind: "book" });

    await user.selectOptions(screen.getByLabelText("Patient"), "9");
    await user.click(await screen.findByRole("button", { name: /9:00\s?AM/ }));
    await user.selectOptions(screen.getByLabelText("Repeat"), "1");
    await user.selectOptions(screen.getByLabelText("Number of sessions"), "4");
    await user.click(screen.getByRole("button", { name: "Book 4 sessions" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("1 of the 4 dates isn't free.");
    expect(alert).toHaveTextContent(/Monday, November 16/);
    expect(onSaved).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /Book the other 3, skip this one/ }));
    expect(api.book).toHaveBeenLastCalledWith(expect.objectContaining({ skip_unavailable: true, repeat: { every_weeks: 1, count: 4 } }));
    expect(onSaved).toHaveBeenCalledWith(expect.stringMatching(/^3 sessions booked, starting Nov 2, 9:00\sAM \(1 skipped\)\.$/));
  });

  test("editing an appointment offers no repeat option", async () => {
    renderModal({ kind: "edit", appt: { appointment_id: 1, patient_id: 9, patient_name: "MARIA SANTOS", start_at: SLOT_9, end_at: SLOT_10, status: "scheduled", reason: null } as Appointment });
    await screen.findByRole("button", { name: /9:00\s?AM/ });
    expect(screen.queryByLabelText("Repeat")).not.toBeInTheDocument();
  });
});

describe("AppointmentFormModal — a new patient's concern", () => {
  test("'Other' shows a box to specify the concern, and that text is saved", async () => {
    const user = userEvent.setup();
    addPatient.mockResolvedValue({ ok: true, data: { id: 42 } });
    api.book.mockResolvedValue({} as Appointment);
    renderModal({ kind: "book" });

    await user.click(screen.getByRole("button", { name: /New patient/ }));
    await user.type(screen.getByLabelText("First name"), "Juan");
    await user.type(screen.getByLabelText("Last name"), "Dela Cruz");
    await user.selectOptions(screen.getByLabelText("Age"), "29");
    await user.selectOptions(screen.getByLabelText("Gender"), "male");
    await user.selectOptions(screen.getByLabelText("Primary concern"), "__other__");
    await user.click(await screen.findByRole("button", { name: /9:00\s?AM/ }));
    const submit = screen.getByRole("button", { name: "Book appointment" });
    expect(submit).toBeDisabled(); // "Other" chosen but not specified yet

    await user.type(screen.getByPlaceholderText("Specify the concern *"), "Grief after a loss");
    await user.click(submit);
    expect(addPatient).toHaveBeenCalledWith(expect.objectContaining({ concern: "Grief after a loss" }));
  });
});

describe("AppointmentFormModal — contacts for reminders", () => {
  beforeEach(() => vi.stubEnv("VITE_REMINDER_EMAILS", "true"));
  afterEach(() => vi.unstubAllEnvs());

  test("while reminder emails are off, only the contacts show", async () => {
    vi.stubEnv("VITE_REMINDER_EMAILS", "false");
    const user = userEvent.setup();
    renderModal({ kind: "book" });
    await user.selectOptions(screen.getByLabelText("Patient"), "9");
    expect(screen.getByText("Contact: +639171234567 · maria@gmail.com")).toBeInTheDocument();
    expect(screen.queryByText("reminder emails on")).not.toBeInTheDocument();
  });

  test("a new patient's mobile number and email are saved with the patient", async () => {
    const user = userEvent.setup();
    addPatient.mockResolvedValue({ ok: true, data: { id: 42 } });
    api.book.mockResolvedValue({} as Appointment);
    renderModal({ kind: "book" });

    await user.click(screen.getByRole("button", { name: /New patient/ }));
    await user.type(screen.getByLabelText("First name"), "Juan");
    await user.type(screen.getByLabelText("Last name"), "Dela Cruz");
    await user.selectOptions(screen.getByLabelText("Age"), "29");
    await user.selectOptions(screen.getByLabelText("Gender"), "male");
    await user.selectOptions(screen.getByLabelText("Primary concern"), "Anxiety");
    await user.type(screen.getByLabelText("Mobile number"), "0917 123 4567");
    await user.type(screen.getByLabelText("Email"), "juan@gmail.com");
    await user.click(screen.getByRole("checkbox", { name: /agreed to get appointment reminders/ }));
    await user.click(await screen.findByRole("button", { name: /9:00\s?AM/ }));
    await user.click(screen.getByRole("button", { name: "Book appointment" }));

    expect(addPatient).toHaveBeenCalledWith(expect.objectContaining({ contact_number: "0917 123 4567", email: "juan@gmail.com", reminder_consent: true }));
  });

  test("choosing an existing patient shows where reminders will go", async () => {
    const user = userEvent.setup();
    renderModal({ kind: "book" });
    await user.selectOptions(screen.getByLabelText("Patient"), "9");
    expect(screen.getByText(/Contact: \+639171234567 · maria@gmail\.com/)).toBeInTheDocument();
    expect(screen.getByText("reminder emails on")).toBeInTheDocument();
  });
});
