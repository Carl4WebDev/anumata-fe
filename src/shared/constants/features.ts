/**
 * Appointment reminder emails (EmailJS). Off until VITE_REMINDER_EMAILS=true —
 * while off, the consent box and "reminder emailed" labels are hidden.
 * The backend only sends when its EMAILJS_* keys are set.
 */
export function reminderEmailsEnabled(): boolean {
  return import.meta.env.VITE_REMINDER_EMAILS === "true";
}
