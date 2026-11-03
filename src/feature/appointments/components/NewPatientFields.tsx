import { GENDERS, PATIENT_CONCERNS } from "../../../shared/constants/choices";
import ChoiceInput from "../../../shared/components/ChoiceInput";
import ContactFields from "../../patients/components/ContactFields";
import { MAX_PATIENT_AGE, MIN_PATIENT_AGE, type NewPatientDraft } from "../utils/newPatient";

const AGES = Array.from({ length: MAX_PATIENT_AGE - MIN_PATIENT_AGE + 1 }, (_, i) => MIN_PATIENT_AGE + i);
// ChoiceInput adds its own "Other (type your own)…" with a box to specify the concern.
const CONCERN_CHOICES = PATIENT_CONCERNS.filter((c) => c !== "Other");

const field = "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500";

interface NewPatientFieldsProps {
  value: NewPatientDraft;
  onChange: (next: NewPatientDraft) => void;
}

export default function NewPatientFields({ value, onChange }: NewPatientFieldsProps) {
  const set = (key: keyof NewPatientDraft) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    onChange({ ...value, [key]: e.target.value });

  return (
    <div className="space-y-2 rounded-xl border border-teal-100 bg-teal-50/40 p-3">
      <div className="grid grid-cols-3 gap-2">
        <input value={value.f_name} onChange={set("f_name")} placeholder="First name *" maxLength={75} aria-label="First name" className={field} />
        <input value={value.m_name} onChange={set("m_name")} placeholder="Middle" maxLength={75} aria-label="Middle name" className={field} />
        <input value={value.l_name} onChange={set("l_name")} placeholder="Last name *" maxLength={75} aria-label="Last name" className={field} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <select value={value.age} onChange={set("age")} aria-label="Age" className={field}>
          <option value="">Age *</option>
          {AGES.map((age) => (
            <option key={age} value={age}>
              {age}
            </option>
          ))}
        </select>
        <select value={value.gender} onChange={set("gender")} aria-label="Gender" className={field}>
          <option value="">Gender *</option>
          {GENDERS.map((g) => (
            <option key={g.value} value={g.value}>
              {g.label}
            </option>
          ))}
        </select>
      </div>
      <ChoiceInput
        value={value.concern}
        onChange={(concern) => onChange({ ...value, concern })}
        options={CONCERN_CHOICES}
        placeholder="Concern *"
        otherPlaceholder="Specify the concern *"
        ariaLabel="Primary concern"
        className={field}
      />
      <ContactFields
        compact
        value={{ contactNumber: value.contact_number, email: value.email, reminderConsent: value.reminder_consent }}
        onChange={({ contactNumber, email, reminderConsent }) =>
          onChange({ ...value, contact_number: contactNumber, email, reminder_consent: reminderConsent })
        }
      />
      <p className="text-xs text-slate-500">A patient record is created when you book. You can add more details later on the patient's page.</p>
    </div>
  );
}
