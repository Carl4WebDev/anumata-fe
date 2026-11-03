import type { ContactValue } from "./contactValue";
import { reminderEmailsEnabled } from "../../../shared/constants/features";

interface ContactFieldsProps {
  value: ContactValue;
  onChange: (next: ContactValue) => void;
  /** Smaller inputs, as in the booking form. */
  compact?: boolean;
}

/** Mobile number and email for appointment reminders — both optional — plus the patient's consent. */
export default function ContactFields({ value, onChange, compact = false }: ContactFieldsProps) {
  const input = compact
    ? "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500"
    : "w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500";
  const hasEmail = Boolean(value.email.trim());
  return (
    <fieldset>
      <legend className={compact ? "mb-1 text-xs font-medium text-slate-600" : "mb-1 text-sm font-medium text-slate-700"}>
        Contact for reminders <span className="font-normal text-slate-400">(optional)</span>
      </legend>
      <div className="grid gap-2 sm:grid-cols-2">
        <input
          type="tel"
          inputMode="tel"
          value={value.contactNumber}
          onChange={(e) => onChange({ ...value, contactNumber: e.target.value })}
          placeholder="Mobile, e.g. 0917 123 4567"
          maxLength={20}
          aria-label="Mobile number"
          autoComplete="off"
          className={input}
        />
        <input
          type="email"
          value={value.email}
          // Clearing the email also clears consent — there'd be nowhere to send to.
          onChange={(e) =>
            onChange({ ...value, email: e.target.value, reminderConsent: value.reminderConsent && Boolean(e.target.value.trim()) })
          }
          placeholder="Email, e.g. name@gmail.com"
          maxLength={255}
          aria-label="Email"
          autoComplete="off"
          className={input}
        />
      </div>
      {reminderEmailsEnabled() && (
        <label className={`mt-2 flex items-start gap-2 text-xs ${hasEmail ? "text-slate-600" : "text-slate-400"}`}>
          <input
            type="checkbox"
            checked={hasEmail && value.reminderConsent}
            disabled={!hasEmail}
            onChange={(e) => onChange({ ...value, reminderConsent: e.target.checked })}
            className="mt-0.5 accent-teal-600"
          />
          <span>
            Patient agreed to get appointment reminders by email
            {!hasEmail && " (add an email first)"}
          </span>
        </label>
      )}
    </fieldset>
  );
}
