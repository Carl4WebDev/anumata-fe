import { httpClient } from "./httpClient";
import type { LicenseStatus } from "../constants/professions";

export type AccountRole = "THERAPIST" | "ADMIN";

export interface TherapistProfile {
  user_id: number;
  email: string;
  f_name: string;
  m_name: string | null;
  l_name: string;
  full_name?: string;
  profile_image: string | null;
  phone: string | null;
  specialization: string | null;
  license_number: string | null;
  affiliation: string | null;
  created_at?: string;
  role?: AccountRole;
  /** PRC license: profession and the name exactly as on the PRC ID. */
  profession?: string | null;
  license_name?: string | null;
  /** Checked by an admin on the PRC verification site. */
  license_status?: LicenseStatus;
  /** Why the admin marked it "not matched". */
  license_note?: string | null;
  license_checked_at?: string | null;
}

export interface LoginResponse {
  token: string;
  user: {
    user_id: number;
    email: string;
    f_name: string;
    m_name: string | null;
    l_name: string;
    role?: AccountRole;
    license_status?: LicenseStatus;
  };
}

export interface RegisterResponse {
  user_id: number;
  email: string;
  f_name: string;
  m_name: string | null;
  l_name: string;
}

export interface UpdateProfileData {
  f_name?: string;
  m_name?: string;
  l_name?: string;
  profile_image?: string | null;
  phone?: string;
  specialization?: string;
  license_number?: string;
  profession?: string;
  license_name?: string;
  affiliation?: string;
}

export const authApi = {
  login(email: string, password: string) {
    return httpClient.post<LoginResponse>("/api/auth/login", { email, password });
  },

  register(data: {
    email: string;
    password: string;
    f_name: string;
    m_name?: string;
    l_name: string;
    /** User Consent and Agreement Validation — required by the server. */
    accepted_terms: boolean;
    terms_version: string;
    /** PRC license — required; checked later by an admin. */
    profession: string;
    license_number: string;
    license_name: string;
  }) {
    return httpClient.post<RegisterResponse>("/api/auth/register", data);
  },

  getProfile() {
    return httpClient.get<TherapistProfile>("/api/auth/profile");
  },

  updateProfile(data: UpdateProfileData) {
    return httpClient.patch<TherapistProfile>("/api/auth/profile", data);
  },

  changePassword(current_password: string, new_password: string) {
    return httpClient.patch<{ message: string }>("/api/auth/profile/password", { current_password, new_password });
  },

  logout() {
    return httpClient.post<{ message: string }>("/api/auth/logout");
  },
};
