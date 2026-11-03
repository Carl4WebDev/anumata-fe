import { useState } from "react";
import { Check, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { appointmentsApi, type Schedule, type SessionType } from "../../../shared/api/appointmentsApi";
import { BREAK_LENGTHS, SESSION_LENGTHS } from "../../../shared/constants/choices";
import { formatMinutes } from "../utils/appointmentUtils";
import { useScheduleAction } from "./useScheduleAction";

interface SessionSettingsProps {
  schedule: Schedule;
  onChanged: () => Promise<void>;
}

const inputClass = "rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-teal-500";
const saveBtn =
  "flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50";
const iconBtn = "rounded-lg p-1 text-slate-400 disabled:opacity-40";

/** The standard lengths, plus `current` if it is something else. */
function lengthChoices(current: number): number[] {
  return SESSION_LENGTHS.includes(current as (typeof SESSION_LENGTHS)[number])
    ? [...SESSION_LENGTHS]
    : [...SESSION_LENGTHS, current].sort((a, b) => a - b);
}

function LengthSelect({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  return (
    <select value={value} onChange={(e) => onChange(Number(e.target.value))} className={inputClass} aria-label={label}>
      {lengthChoices(value).map((m) => (
        <option key={m} value={m}>
          {formatMinutes(m)}
        </option>
      ))}
    </select>
  );
}

/** Default session length (for bookings without a type) and the break after each session. */
export function SessionLengthEditor({ schedule, onChanged }: SessionSettingsProps) {
  const { busy, run } = useScheduleAction(onChanged);
  const saved = schedule.settings;
  const [minutes, setMinutes] = useState(saved.slot_minutes);
  const [breakMinutes, setBreakMinutes] = useState(saved.break_minutes ?? 0);
  const unchanged = minutes === saved.slot_minutes && breakMinutes === (saved.break_minutes ?? 0);

  return (
    <div className="space-y-4">
      <label className="block max-w-xs text-sm text-slate-600">
        Default session length
        <div className="mt-1">
          <LengthSelect value={minutes} onChange={setMinutes} label="Default session length" />
        </div>
        <span className="mt-1 block text-xs text-slate-400">Used when you book without choosing a session type.</span>
      </label>
      <label className="block max-w-xs text-sm text-slate-600">
        Break after each session
        <select
          value={breakMinutes}
          onChange={(e) => setBreakMinutes(Number(e.target.value))}
          className={`${inputClass} mt-1 block w-full`}
          aria-label="Break after each session"
        >
          {BREAK_LENGTHS.map((m) => (
            <option key={m} value={m}>
              {m === 0 ? "No break" : formatMinutes(m)}
            </option>
          ))}
        </select>
        <span className="mt-1 block text-xs text-slate-400">
          Free times leave this gap after every appointment, for notes or rest.
        </span>
      </label>
      <p className="text-xs text-slate-400">Appointments already booked keep their times.</p>
      <button
        onClick={() =>
          run(() => appointmentsApi.updateSettings({ slot_minutes: minutes, break_minutes: breakMinutes }), "Session settings saved")
        }
        disabled={busy || unchanged}
        className={saveBtn}
      >
        <Save size={15} /> {busy ? "Saving…" : "Save"}
      </button>
    </div>
  );
}

/** The therapist's own kinds of session ("Consultation", 30 min), each booked with its own length. */
export function SessionTypesEditor({ schedule, onChanged }: SessionSettingsProps) {
  const { busy, run } = useScheduleAction(onChanged);
  const [name, setName] = useState("");
  const [minutes, setMinutes] = useState(schedule.settings.slot_minutes);
  const [editingId, setEditingId] = useState<number | null>(null);

  const add = () =>
    run(
      () => appointmentsApi.createSessionType({ name: name.trim(), duration_minutes: minutes }),
      "Session type added",
      () => setName(""),
    );

  return (
    <div>
      <p className="mb-3 text-xs text-slate-400">
        Name the kinds of session you offer and how long each takes. When booking, pick one and the free times fit its
        length. Changing or removing a type does not change appointments already booked.
      </p>
      {schedule.session_types.length === 0 ? (
        <p className="mb-4 text-sm text-slate-400">
          No session types yet — bookings use your default length ({formatMinutes(schedule.settings.slot_minutes)}).
        </p>
      ) : (
        <ul className="mb-4 space-y-2">
          {schedule.session_types.map((type) =>
            editingId === type.session_type_id ? (
              <SessionTypeRowEditor
                key={type.session_type_id}
                type={type}
                busy={busy}
                onCancel={() => setEditingId(null)}
                onSave={(changes) =>
                  run(() => appointmentsApi.updateSessionType(type.session_type_id, changes), "Session type updated", () =>
                    setEditingId(null),
                  )
                }
              />
            ) : (
              <li key={type.session_type_id} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm">
                <span className="flex-1 font-medium text-[#08132E]">{type.name}</span>
                <span className="text-slate-500">{formatMinutes(type.duration_minutes)}</span>
                <button
                  onClick={() => setEditingId(type.session_type_id)}
                  disabled={busy}
                  className={`${iconBtn} hover:bg-teal-50 hover:text-teal-700`}
                  aria-label={`Edit ${type.name}`}
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => run(() => appointmentsApi.removeSessionType(type.session_type_id), "Session type removed")}
                  disabled={busy}
                  className={`${iconBtn} hover:bg-rose-50 hover:text-rose-600`}
                  aria-label={`Remove ${type.name}`}
                >
                  <Trash2 size={14} />
                </button>
              </li>
            ),
          )}
        </ul>
      )}
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex-1 text-xs text-slate-500">
          Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            placeholder="e.g. Consultation"
            className={`${inputClass} mt-1 w-full`}
          />
        </label>
        <label className="text-xs text-slate-500">
          Length
          <div className="mt-1">
            <LengthSelect value={minutes} onChange={setMinutes} label="Length" />
          </div>
        </label>
        <button onClick={() => void add()} disabled={busy || !name.trim()} className={saveBtn}>
          <Plus size={15} /> Add
        </button>
      </div>
    </div>
  );
}

function SessionTypeRowEditor({
  type,
  busy,
  onSave,
  onCancel,
}: {
  type: SessionType;
  busy: boolean;
  onSave: (changes: { name: string; duration_minutes: number }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(type.name);
  const [minutes, setMinutes] = useState(type.duration_minutes);
  return (
    <li className="flex flex-wrap items-center gap-2 rounded-xl border border-teal-200 bg-teal-50/40 px-3 py-2">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={60}
        className={`${inputClass} flex-1`}
        aria-label="Session type name"
      />
      <LengthSelect value={minutes} onChange={setMinutes} label="Session type length" />
      <button
        onClick={() => onSave({ name: name.trim(), duration_minutes: minutes })}
        disabled={busy || !name.trim()}
        className={`${iconBtn} text-teal-600 hover:bg-teal-100`}
        aria-label="Save session type"
      >
        <Check size={16} />
      </button>
      <button onClick={onCancel} disabled={busy} className={`${iconBtn} hover:bg-slate-100`} aria-label="Cancel editing">
        <X size={16} />
      </button>
    </li>
  );
}
