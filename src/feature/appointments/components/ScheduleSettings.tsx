import { useState } from "react";
import { Clock, Plus, Trash2, Save, Ban, Timer, ChevronDown, ChevronUp } from "lucide-react";
import { appointmentsApi, type Schedule } from "../../../shared/api/appointmentsApi";
import { useToast } from "../../../shared/context/ToastContext";
import { WEEKDAYS, formatDateTime, manilaInputToIso } from "../utils/appointmentUtils";
import ChoiceInput from "../../../shared/components/ChoiceInput";
import { BLOCKED_PERIOD_REASONS, SESSION_LENGTHS, formatClock, timeOptions } from "../../../shared/constants/choices";

type Tab = "hours" | "blocked" | "length";

interface ScheduleSettingsProps {
  schedule: Schedule;
  onChanged: () => Promise<void>;
}

const inputClass = "rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-teal-500";
const saveBtn =
  "flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50";

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Something went wrong.";
}

/** Runs a schedule change, refreshes the page data and reports via toast. */
function useScheduleAction(onChanged: () => Promise<void>) {
  const { success, error } = useToast();
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<unknown>, message: string): Promise<boolean> => {
    setBusy(true);
    try {
      await fn();
      await onChanged();
      success(message);
      return true;
    } catch (err) {
      error(errorMessage(err));
      return false;
    } finally {
      setBusy(false);
    }
  };
  return { busy, run };
}

export default function ScheduleSettings({ schedule, onChanged }: ScheduleSettingsProps) {
  const { availability, settings } = schedule;
  const [open, setOpen] = useState(availability.length === 0);
  const [tab, setTab] = useState<Tab>("hours");

  const workingDays = [...new Set(availability.map((w) => w.weekday))].sort((a, b) => a - b);
  const summary =
    availability.length === 0
      ? "No working hours yet — set them up before booking appointments."
      : `${workingDays.map((d) => WEEKDAYS[d]).join(", ")} · ${settings.slot_minutes}-minute sessions`;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between gap-3 text-left">
        <div>
          <h2 className="flex items-center gap-2 font-semibold text-[#08132E]">
            <Clock size={18} className="text-teal-600" /> My schedule
          </h2>
          <p className={`text-sm ${availability.length === 0 ? "text-amber-600" : "text-slate-500"}`}>{summary}</p>
        </div>
        {open ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
      </button>

      {open && (
        <div className="mt-4 border-t border-slate-100 pt-4">
          <div className="mb-4 flex flex-wrap gap-2">
            {([
              ["hours", "Working hours", Clock],
              ["blocked", "Blocked periods", Ban],
              ["length", "Session length", Timer],
            ] as const).map(([key, label, Icon]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-sm ${
                  tab === key ? "border-teal-600 bg-teal-50 text-teal-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>
          {tab === "hours" && <WorkingHoursEditor schedule={schedule} onChanged={onChanged} />}
          {tab === "blocked" && <BlockedPeriodsEditor schedule={schedule} onChanged={onChanged} />}
          {tab === "length" && <SessionLengthEditor schedule={schedule} onChanged={onChanged} />}
        </div>
      )}
    </div>
  );
}

const WORKING_TIMES = timeOptions("05:00", "23:00", 30);

/** Dropdown of half-hour times; keeps an off-grid saved value selectable. */
function TimeSelect({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const options = WORKING_TIMES.includes(value) ? WORKING_TIMES : [...WORKING_TIMES, value].sort();
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={inputClass} aria-label={label}>
      {options.map((t) => (
        <option key={t} value={t}>
          {formatClock(t)}
        </option>
      ))}
    </select>
  );
}

function WorkingHoursEditor({ schedule, onChanged }: ScheduleSettingsProps) {
  const { busy, run } = useScheduleAction(onChanged);
  const [windows, setWindows] = useState(() =>
    schedule.availability.map((w) => ({
      weekday: w.weekday,
      start_time: w.start_time.slice(0, 5),
      end_time: w.end_time.slice(0, 5),
    })),
  );

  const update = (index: number, field: "start_time" | "end_time", value: string) =>
    setWindows((prev) => prev.map((w, i) => (i === index ? { ...w, [field]: value } : w)));
  const remove = (index: number) => setWindows((prev) => prev.filter((_, i) => i !== index));
  const add = (weekday: number) => setWindows((prev) => [...prev, { weekday, start_time: "09:00", end_time: "17:00" }]);

  const invalid = windows.some((w) => !w.start_time || !w.end_time || w.start_time >= w.end_time);

  return (
    <div>
      <p className="mb-3 text-xs text-slate-400">
        Appointments can only be booked inside these hours (Philippine time). A day without hours is closed. Use two
        ranges for a lunch break, e.g. 09:00–12:00 and 13:00–17:00.
      </p>
      <div className="space-y-2">
        {WEEKDAYS.map((label, weekday) => {
          const dayWindows = windows.map((w, index) => ({ ...w, index })).filter((w) => w.weekday === weekday);
          return (
            <div key={label} className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
              <span className="w-10 text-sm font-medium text-[#08132E]">{label}</span>
              {dayWindows.length === 0 && <span className="text-sm text-slate-400">Closed</span>}
              {dayWindows.map((w) => (
                <span key={w.index} className="flex items-center gap-1">
                  <TimeSelect value={w.start_time} onChange={(v) => update(w.index, "start_time", v)} label={`${label} start`} />
                  <span className="text-slate-400">–</span>
                  <TimeSelect value={w.end_time} onChange={(v) => update(w.index, "end_time", v)} label={`${label} end`} />
                  <button onClick={() => remove(w.index)} className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label={`Remove ${label} hours`}>
                    <Trash2 size={14} />
                  </button>
                </span>
              ))}
              <button onClick={() => add(weekday)} className="ml-auto flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-teal-600 hover:bg-teal-50">
                <Plus size={13} /> Add hours
              </button>
            </div>
          );
        })}
      </div>
      {invalid && <p className="mt-2 text-xs text-rose-600">Each start time must be before its end time.</p>}
      <p className="mt-2 text-xs text-slate-400">Changing hours does not move or cancel appointments already booked.</p>
      <button
        onClick={() => run(() => appointmentsApi.setAvailability(windows), "Working hours saved")}
        disabled={busy || invalid}
        className={`mt-4 ${saveBtn}`}
      >
        <Save size={15} /> {busy ? "Saving…" : "Save working hours"}
      </button>
    </div>
  );
}

function BlockedPeriodsEditor({ schedule, onChanged }: ScheduleSettingsProps) {
  const { busy, run } = useScheduleAction(onChanged);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [reason, setReason] = useState("");

  const invalid = !start || !end || start >= end;

  const add = async () => {
    const ok = await run(
      () =>
        appointmentsApi.addUnavailable({
          start_at: manilaInputToIso(start),
          end_at: manilaInputToIso(end),
          reason: reason.trim() || undefined,
        }),
      "Blocked period added",
    );
    if (ok) {
      setStart("");
      setEnd("");
      setReason("");
    }
  };

  return (
    <div>
      <p className="mb-3 text-xs text-slate-400">
        Block leave, holidays or meetings so no appointment can be booked then. Appointments already booked in that
        period are not cancelled automatically.
      </p>
      {schedule.unavailable.length === 0 ? (
        <p className="mb-4 text-sm text-slate-400">No upcoming blocked periods.</p>
      ) : (
        <div className="mb-4 space-y-2">
          {schedule.unavailable.map((u) => (
            <div key={u.unavailable_id} className="flex items-center justify-between gap-2 rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              <span>
                {formatDateTime(u.start_at)} – {formatDateTime(u.end_at)}
                {u.reason && <span className="block text-xs text-rose-500">{u.reason}</span>}
              </span>
              <button
                onClick={() => run(() => appointmentsApi.removeUnavailable(u.unavailable_id), "Blocked period removed")}
                disabled={busy}
                className="rounded-lg p-1 text-rose-400 hover:bg-rose-100 hover:text-rose-700"
                aria-label="Remove blocked period"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_1.2fr_auto] sm:items-end">
        <label className="text-xs text-slate-500">
          From
          <input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} className={`${inputClass} mt-1 w-full`} />
        </label>
        <label className="text-xs text-slate-500">
          Until
          <input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} className={`${inputClass} mt-1 w-full`} />
        </label>
        <div className="text-xs text-slate-500">
          Reason
          <div className="mt-1">
            <ChoiceInput
              value={reason}
              onChange={setReason}
              options={BLOCKED_PERIOD_REASONS}
              placeholder="Select a reason…"
              ariaLabel="Blocked period reason"
              className={`${inputClass} w-full`}
            />
          </div>
        </div>
        <button onClick={add} disabled={busy || invalid} className={`${saveBtn} justify-center`}>
          <Plus size={15} /> Block
        </button>
      </div>
    </div>
  );
}

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} minutes`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${hours} hour${hours > 1 ? "s" : ""}${rest ? ` ${rest} min` : ""}`;
}

function SessionLengthEditor({ schedule, onChanged }: ScheduleSettingsProps) {
  const { busy, run } = useScheduleAction(onChanged);
  const saved = schedule.settings.slot_minutes;
  const [minutes, setMinutes] = useState(saved);
  const choices: number[] = SESSION_LENGTHS.includes(saved as (typeof SESSION_LENGTHS)[number])
    ? [...SESSION_LENGTHS]
    : [...SESSION_LENGTHS, saved].sort((a, b) => a - b);

  return (
    <div>
      <label className="block max-w-xs text-sm text-slate-600">
        Session length
        <select value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} className={`${inputClass} mt-1 w-full`}>
          {choices.map((m) => (
            <option key={m} value={m}>
              {formatMinutes(m)}
            </option>
          ))}
        </select>
      </label>
      <p className="mt-1 text-xs text-slate-400">
        Working hours are divided into slots of this length. Existing appointments keep their length.
      </p>
      <button
        onClick={() => run(() => appointmentsApi.updateSettings({ slot_minutes: minutes }), "Session length saved")}
        disabled={busy || minutes === saved}
        className={`mt-4 ${saveBtn}`}
      >
        <Save size={15} /> {busy ? "Saving…" : "Save"}
      </button>
    </div>
  );
}
