import { createContext } from "react";
import type { TherapistProfile, UpdateProfileData } from "../../../shared/api/authApi";

export interface DisplayUser {
  id: number;
  email: string;
  name: string;
  role: string;
  profileImage: string | null;
}

export type ProfileResult =
  | { ok: true; data: TherapistProfile }
  | { ok: false; error: string };

export type AuthResult =
  | { ok: true; data: { token: string; user: DisplayUser } }
  | { ok: false };

export interface RegisterPayload {
  email: string;
  f_name: string;
  m_name?: string;
  l_name: string;
  password: string;
  accepted_terms: boolean;
  terms_version: string;
}

export interface UserContextValue {
  user: DisplayUser | null;
  profile: TherapistProfile | null;
  loading: boolean;
  error: string | null;
  clearError: () => void;
  fetchProfile: () => Promise<ProfileResult>;
  updateProfile: (data: UpdateProfileData) => Promise<ProfileResult>;
  setProfileImage: (image: string | null) => Promise<ProfileResult>;
  login: (email: string, password: string) => Promise<AuthResult>;
  register: (payload: RegisterPayload) => Promise<AuthResult>;
  clearUser: () => void;
}

export const UserContext = createContext<UserContextValue | null>(null);
