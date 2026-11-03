import { createContext } from "react";

export interface PatientUpdateData {
  f_name?: string;
  m_name?: string;
  l_name?: string;
  age?: number;
  gender?: string;
  primary_concern?: string;
  /** Contacts for appointment reminders; "" clears one. */
  contact_number?: string;
  email?: string;
  /** Patient agreed to email reminders. */
  reminder_consent?: boolean;
  profile_image?: string | null;
  is_archived?: boolean;
}

export interface MutationResult {
  ok: boolean;
  data?: unknown;
  error?: string;
}

/** A new patient, from the Add Patient form or the booking form. Contacts are optional. */
export interface AddPatientInput {
  f_name: string;
  m_name?: string;
  l_name: string;
  age: number;
  gender: string;
  concern: string;
  /** Mobile number for appointment reminders. */
  contact_number?: string;
  /** Email for appointment reminders. */
  email?: string;
  /** Patient agreed to email reminders; only counts with an email. */
  reminder_consent?: boolean;
}

export interface PatientsValue {
  patients: any[];
  loading: boolean;
  error: string | null;
  clearError: () => void;
  addPatient: (data: AddPatientInput) => Promise<MutationResult>;
  removePatient: (id: number) => Promise<void>;
  updatePatient: (id: number, data: PatientUpdateData) => Promise<MutationResult>;
  setArchived: (id: number, isArchived: boolean) => Promise<MutationResult>;
  setProfileImage: (id: number, profileImage: string | null) => Promise<MutationResult>;
}

export const PatientsContext = createContext<PatientsValue | null>(null);
