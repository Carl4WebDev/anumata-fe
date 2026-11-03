/** What the contact fields hold: reminder contacts and the patient's consent. */
export interface ContactValue {
  contactNumber: string;
  email: string;
  /** The patient agreed to get appointment reminders by email. */
  reminderConsent: boolean;
}

export const EMPTY_CONTACT: ContactValue = { contactNumber: "", email: "", reminderConsent: false };
