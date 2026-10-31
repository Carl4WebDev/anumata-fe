// Preset choices for dropdowns. "Other" free text is always available next
// to these (see ChoiceInput), so the lists cover common cases only.

export const PATIENT_CONCERNS = [
  "Family Concerns",
  "Romantic Relationship",
  "Academic Stress",
  "Self Worth",
  "Anxiety",
  "Depression",
  "Other",
] as const;

export const GENDERS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
] as const;

export const APPOINTMENT_REASONS = [
  "Initial consultation",
  "Follow-up session",
  "Therapy session",
  "Progress review",
  "Interview results discussion",
  "Urgent concern",
] as const;

export const CANCEL_REASONS = [
  "Patient asked to cancel",
  "Patient is sick",
  "Patient has a schedule conflict",
  "Therapist is unavailable",
  "Emergency",
  "Booked by mistake",
] as const;

export const BLOCKED_PERIOD_REASONS = [
  "Leave",
  "Holiday",
  "Sick leave",
  "Training / seminar",
  "Meeting",
  "Personal",
] as const;

export const FOLLOW_UP_REASONS = [
  "Follow up on progress",
  "Review interview results",
  "Continue therapy",
  "Check medication or sleep",
  "Re-assessment",
] as const;

export const SESSION_LENGTHS = [15, 20, 30, 45, 50, 60, 75, 90, 120] as const;

/** "HH:MM" times from `from` to `to` (inclusive) every `stepMinutes`. */
export function timeOptions(from = "06:00", to = "22:00", stepMinutes = 30): string[] {
  const toMinutes = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  const pad = (n: number) => String(n).padStart(2, "0");
  const out: string[] = [];
  for (let min = toMinutes(from); min <= toMinutes(to); min += stepMinutes) {
    out.push(`${pad(Math.floor(min / 60))}:${pad(min % 60)}`);
  }
  return out;
}

/** "13:30" → "1:30 PM" */
export function formatClock(time: string): string {
  const [h, m] = time.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}
