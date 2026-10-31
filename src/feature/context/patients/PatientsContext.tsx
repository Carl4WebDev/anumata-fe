import { createContext } from "react";

export interface PatientUpdateData {
  f_name?: string;
  m_name?: string;
  l_name?: string;
  age?: number;
  gender?: string;
  primary_concern?: string;
  profile_image?: string | null;
  is_archived?: boolean;
}

export interface MutationResult {
  ok: boolean;
  data?: unknown;
  error?: string;
}

export interface PatientsValue {
  patients: any[];
  loading: boolean;
  error: string | null;
  clearError: () => void;
  addPatient: (data: {
    f_name: string;
    m_name?: string;
    l_name: string;
    age: number;
    gender: string;
    concern: string;
  }) => Promise<MutationResult>;
  removePatient: (id: number) => Promise<void>;
  updatePatient: (id: number, data: PatientUpdateData) => Promise<MutationResult>;
  setArchived: (id: number, isArchived: boolean) => Promise<MutationResult>;
  setProfileImage: (id: number, profileImage: string | null) => Promise<MutationResult>;
}

export const PatientsContext = createContext<PatientsValue | null>(null);
