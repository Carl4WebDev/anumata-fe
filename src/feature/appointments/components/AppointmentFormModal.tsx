import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ChevronLeft, ChevronRight, Clock, Repeat, UserPlus, Users } from "lucide-react";
import { appointmentsApi, type Appointment, type SessionType } from "../../../shared/api/appointmentsApi";
import { ApiError } from "../../../shared/api/httpClient";
import { usePatients } from "../../context/patients/usePatients";
import ChoiceInput from "../../../shared/components/ChoiceInput";
import { APPOINTMENT_REASONS } from "../../../shared/constants/choices";
import { formatDayHeading, formatMinutes, formatTime, manilaDateOf, manilaToday } from "../utils/appointmentUtils";
import NewPatientFields from "./NewPatientFields";
import { EMPTY_PATIENT, isPatientDraftComplete, type NewPatientDraft } from "../utils/newPatient";

/** Follow-up recommendation a booking fulfils; pre-fills the day and note, and links them. */
export interface BookingFollowUp {
  id: number;
  recommendedDate: string;
  reason: string | null;
}

export type FormMode =
  | { kind: "book"; patientId?: number; followUp?: BookingFollowUp }
  | { kind: "edit"; appt: Appointment };

interface AppointmentFormModalProps {
  mode: FormMode;
  onClose: () => void;
  onSaved: (message: string) => void;
}

interface PatientOption {
  id: number;
  name: string;
  isArchived: boolean;
}

interface SlotResult {
  /** The day and session type these slots were fetched for. */
  key: string;
  minutes?: number;
  slots: string[];
  error?: string;
}

const field = "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500";

function shiftDate(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Something went wrong.";
}

const SERIES_SIZES = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** "6 sessions, Mondays at 9:00 AM, until Monday, December 14" — the series at a glance. */
function seriesSummary(firstSlot: string, everyWeeks: number, count: number): string {
  const last = new Date(Date.parse(firstSlot) + (count - 1) * everyWeeks * WEEK_MS).toISOString();
  const weekday = formatDayHeading(manilaDateOf(firstSlot)).split(",")[0];
  const cadence = everyWeeks === 1 ? `${weekday}s` : `every other ${weekday}`;
  return `${count} sessions, ${cadence} at ${formatTime(firstSlot)}, until ${formatDayHeading(manilaDateOf(last))}.`;
}

export default function AppointmentFormModal({ mode, onClose, onSaved }: AppointmentFormModalProps) {
  const editing = mode.kind === "edit" ? mode.appt : null;
  const followUp = mode.kind === "book" ? mode.followUp : undefined;
  const fixedPatientId = mode.kind === "book" ? mode.patientId : undefined;
  const today = useMemo(() => manilaToday(), []);
  const { patients, addPatient } = usePatients();
  const activePatients = useMemo(
    () => (patients as PatientOption[]).filter((p) => !p.isArchived).sort((a, b) => a.name.localeCompare(b.name)),
    [patients],
  );

  const [patientId, setPatientId] = useState(fixedPatientId ? String(fixedPatientId) : "");
  // Walk-ins / first-time callers get a patient record created as part of booking.
  const [patientMode, setPatientMode] = useState<"existing" | "new">(activePatients.length === 0 ? "new" : "existing");
  const [newPatient, setNewPatient] = useState<NewPatientDraft>(EMPTY_PATIENT);
  const [date, setDate] = useState(() => {
    if (editing) return manilaDateOf(editing.start_at);
    if (followUp) {
      const recommended = manilaDateOf(followUp.recommendedDate);
      return recommended > today ? recommended : today;
    }
    return today;
  });
  const [selectedSlot, setSelectedSlot] = useState<string | null>(editing?.start_at ?? null);
  const [reason, setReason] = useState(editing?.reason ?? followUp?.reason ?? "");
  const fixedPatientName = fixedPatientId
    ? (activePatients.find((p) => p.id === fixedPatientId)?.name ?? `Patient #${fixedPatientId}`)
    : null;
  const [slotResult, setSlotResult] = useState<SlotResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Recurring series (new bookings only): every 1 or 2 weeks, for a number of sessions.
  const [repeatEvery, setRepeatEvery] = useState<"none" | "1" | "2">("none");
  const [repeatCount, setRepeatCount] = useState(6);
  // Some dates of the series aren't free: ask before booking the rest.
  const [seriesConflict, setSeriesConflict] = useState<{ message: string; unavailable: string[]; availableCount: number } | null>(null);
  const repeating = !editing && repeatEvery !== "none";
  // The therapist's session types (new bookings only); "" books the default length.
  const [sessionTypes, setSessionTypes] = useState<SessionType[]>([]);
  const [sessionTypeId, setSessionTypeId] = useState("");

  const isBooking = !editing;
  useEffect(() => {
    if (!isBooking) return;
    let cancelled = false;
    // Without the list the form still books at the default length, so a failure here is not shown.
    appointmentsApi.getSchedule().then(
      (schedule) => !cancelled && setSessionTypes(schedule.session_types ?? []),
      () => undefined,
    );
    return () => {
      cancelled = true;
    };
  }, [isBooking]);

  const excludeId = editing?.appointment_id;
  const typeId = sessionTypeId ? Number(sessionTypeId) : undefined;
  const slotKey = `${date}|${sessionTypeId}`;
  useEffect(() => {
    let cancelled = false;
    appointmentsApi.freeSlots(date, excludeId, typeId).then(
      (result) => !cancelled && setSlotResult({ key: slotKey, minutes: result.slot_minutes, slots: result.slots }),
      (err: unknown) => !cancelled && setSlotResult({ key: slotKey, slots: [], error: errorMessage(err) }),
    );
    return () => {
      cancelled = true;
    };
  }, [date, excludeId, typeId, slotKey]);

  // Result for the currently chosen day and type, or null while it is loading.
  const current = slotResult && slotResult.key === slotKey ? slotResult : null;
  const slots = current?.slots ?? [];

  const changeDate = (next: string) => {
    if (!next || next < today) return;
    setDate(next);
    setSelectedSlot(null);
  };

  const changeSessionType = (next: string) => {
    setSessionTypeId(next);
    setSelectedSlot(null);
  };

  const timeChanged = editing ? selectedSlot !== null && Date.parse(selectedSlot) !== Date.parse(editing.start_at) : true;
  const reasonChanged = editing ? reason.trim() !== (editing.reason ?? "") : true;
  const creatingPatient = !editing && !fixedPatientId && patientMode === "new";
  const patientReady = creatingPatient ? isPatientDraftComplete(newPatient) : Boolean(patientId);
  const canSubmit =
    !busy && selectedSlot !== null && (editing ? timeChanged || reasonChanged : patientReady);

  /** Creates the new patient's record; afterwards the modal treats them as existing so a retry can't duplicate them. */
  const createPatient = async (): Promise<number | null> => {
    const res = await addPatient({
      f_name: newPatient.f_name.trim(),
      m_name: newPatient.m_name.trim() || undefined,
      l_name: newPatient.l_name.trim(),
      age: Number(newPatient.age),
      gender: newPatient.gender,
      concern: newPatient.concern,
    });
    if (!res.ok) {
      setError(res.error ?? "Could not create the patient record.");
      return null;
    }
    const id = (res.data as { id: number }).id;
    setPatientId(String(id));
    setPatientMode("existing");
    return id;
  };

  const submit = async (skipUnavailable = false) => {
    if (!selectedSlot) return;
    setBusy(true);
    setError(null);
    setSeriesConflict(null);
    let patientCreated = false;
    try {
      if (editing) {
        await appointmentsApi.update(editing.appointment_id, {
          ...(timeChanged ? { start_at: selectedSlot } : {}),
          ...(reasonChanged ? { reason: reason.trim() } : {}),
        });
        onSaved(timeChanged ? "Appointment moved" : "Appointment updated");
        return;
      }
      let bookFor = Number(patientId);
      if (creatingPatient) {
        const id = await createPatient();
        if (id === null) {
          setBusy(false);
          return;
        }
        bookFor = id;
        patientCreated = true;
      }
      const result = await appointmentsApi.book({
        patient_id: bookFor,
        start_at: selectedSlot,
        reason: reason.trim() || undefined,
        follow_up_id: followUp?.id,
        ...(typeId ? { session_type_id: typeId } : {}),
        ...(repeating ? { repeat: { every_weeks: Number(repeatEvery) as 1 | 2, count: repeatCount }, skip_unavailable: skipUnavailable } : {}),
      });
      if ("appointments" in result) {
        const skipped = result.skipped.length ? ` (${result.skipped.length} skipped)` : "";
        onSaved(`${patientCreated ? "Patient added and " : ""}${result.appointments.length} sessions booked${skipped}`);
      } else {
        onSaved(patientCreated ? "Patient added and appointment booked" : "Appointment booked");
      }
    } catch (err) {
      const details = err instanceof ApiError ? (err.details as { unavailable?: string[]; available_count?: number } | undefined) : undefined;
      if (err instanceof ApiError && err.code === "RECURRENCE_CONFLICT" && details?.unavailable) {
        setSeriesConflict({ message: err.message, unavailable: details.unavailable, availableCount: details.available_count ?? 0 });
        setBusy(false);
        return;
      }
      const message = errorMessage(err);
      setError(patientCreated ? `The patient record was created, but the booking failed: ${message} Pick another time and try again.` : message);
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-1 text-lg font-semibold text-[#08132E]">{editing ? "Edit appointment" : "Book appointment"}</h3>
        {followUp ? (
          <p className="mb-4 text-sm text-slate-500">
            For the follow-up recommended on {formatDayHeading(manilaDateOf(followUp.recommendedDate))}. Booking it marks the
            follow-up as scheduled.
          </p>
        ) : (
          <div className="mb-3" />
        )}

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">Patient</label>
            {editing || fixedPatientName ? (
              <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-[#08132E]">{editing?.patient_name ?? fixedPatientName}</p>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  {([
                    ["existing", "Existing patient", Users],
                    ["new", "New patient", UserPlus],
                  ] as const).map(([key, label, Icon]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setPatientMode(key)}
                      disabled={key === "existing" && activePatients.length === 0}
                      className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-sm disabled:opacity-40 ${
                        patientMode === key ? "border-teal-600 bg-teal-50 text-teal-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <Icon size={15} /> {label}
                    </button>
                  ))}
                </div>
                {patientMode === "new" ? (
                  <NewPatientFields value={newPatient} onChange={setNewPatient} />
                ) : (
                  <select value={patientId} onChange={(e) => setPatientId(e.target.value)} className={field} aria-label="Patient">
                    <option value="">Select a patient…</option>
                    {activePatients.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>

          {!editing && sessionTypes.length > 0 && (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600">Session type</label>
              <select value={sessionTypeId} onChange={(e) => changeSessionType(e.target.value)} className={field} aria-label="Session type">
                <option value="">Standard session</option>
                {sessionTypes.map((t) => (
                  <option key={t.session_type_id} value={t.session_type_id}>
                    {t.name} · {formatMinutes(t.duration_minutes)}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">Day</label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => changeDate(shiftDate(date, -1))}
                disabled={date <= today}
                className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 disabled:opacity-40"
                aria-label="Previous day"
              >
                <ChevronLeft size={16} />
              </button>
              <input type="date" value={date} min={today} onChange={(e) => changeDate(e.target.value)} className={field} />
              <button
                onClick={() => changeDate(shiftDate(date, 1))}
                className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
                aria-label="Next day"
              >
                <ChevronRight size={16} />
              </button>
            </div>
            <p className="mt-1 text-xs text-slate-400">{formatDayHeading(date)}</p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">
              Free times
              {current?.minutes && <span className="font-normal text-slate-400"> · {formatMinutes(current.minutes)} each</span>}
            </label>
            {!current ? (
              <p className="text-sm text-slate-400">Loading free times…</p>
            ) : current.error ? (
              <p className="text-sm text-rose-600">{current.error}</p>
            ) : slots.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 p-3 text-sm text-slate-400">
                No free times on this day — it is outside your working hours, blocked, or fully booked.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {slots.map((slot) => (
                  <button
                    key={slot}
                    onClick={() => setSelectedSlot(slot)}
                    className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm ${
                      selectedSlot === slot
                        ? "border-teal-600 bg-teal-50 font-medium text-teal-700"
                        : "border-slate-200 text-slate-700 hover:border-teal-300 hover:bg-teal-50/50"
                    }`}
                  >
                    <Clock size={13} /> {formatTime(slot)}
                    {editing && Date.parse(slot) === Date.parse(editing.start_at) && (
                      <span className="text-xs text-slate-400">(current)</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">
              Reason <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <ChoiceInput
              value={reason}
              onChange={setReason}
              options={APPOINTMENT_REASONS}
              placeholder="Select a reason…"
              otherPlaceholder="e.g. Couples session"
              ariaLabel="Reason"
              className={field}
            />
          </div>

          {!editing && (
            <div>
              <label className="mb-1 flex items-center gap-1.5 text-sm font-medium text-slate-600">
                <Repeat size={14} /> Repeat
              </label>
              <div className="flex flex-wrap gap-2">
                <select
                  value={repeatEvery}
                  onChange={(e) => setRepeatEvery(e.target.value as "none" | "1" | "2")}
                  aria-label="Repeat"
                  className={`${field} sm:w-auto`}
                >
                  <option value="none">Does not repeat</option>
                  <option value="1">Every week</option>
                  <option value="2">Every 2 weeks</option>
                </select>
                {repeating && (
                  <select
                    value={repeatCount}
                    onChange={(e) => setRepeatCount(Number(e.target.value))}
                    aria-label="Number of sessions"
                    className={`${field} sm:w-auto`}
                  >
                    {SERIES_SIZES.map((n) => (
                      <option key={n} value={n}>
                        {n} sessions
                      </option>
                    ))}
                  </select>
                )}
              </div>
              {repeating && selectedSlot && (
                <p className="mt-1 text-xs text-slate-500">
                  {seriesSummary(selectedSlot, Number(repeatEvery), repeatCount)}
                </p>
              )}
            </div>
          )}
        </div>

        {seriesConflict && (
          <div role="alert" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <p className="flex items-center gap-2 font-medium">
              <AlertTriangle size={16} className="shrink-0" /> {seriesConflict.message}
            </p>
            <ul className="mt-1 list-inside list-disc text-amber-800">
              {seriesConflict.unavailable.map((d) => (
                <li key={d}>
                  {formatDayHeading(manilaDateOf(d))}, {formatTime(d)}
                </li>
              ))}
            </ul>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => void submit(true)}
                disabled={busy}
                className="rounded-xl bg-amber-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
              >
                Book the other {seriesConflict.availableCount}, skip {seriesConflict.unavailable.length === 1 ? "this one" : "these"}
              </button>
              <button onClick={() => setSeriesConflict(null)} className="rounded-xl border border-amber-300 px-3 py-1.5 text-sm text-amber-800 hover:bg-amber-100">
                Choose another time
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} disabled={busy} className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
            Close
          </button>
          <button
            onClick={() => void submit()}
            disabled={!canSubmit}
            className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {busy ? "Saving…" : editing ? "Save changes" : repeating ? `Book ${repeatCount} sessions` : "Book appointment"}
          </button>
        </div>
      </div>
    </div>
  );
}
