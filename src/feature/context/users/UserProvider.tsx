import { useState, useCallback, useMemo, useEffect } from "react";
import { UserContext, type DisplayUser, type ProfileResult, type AuthResult, type RegisterPayload } from "./UserContext";
import { authApi, type TherapistProfile, type UpdateProfileData } from "../../../shared/api/authApi";
import { ApiError } from "../../../shared/api/httpClient";
import { formatName } from "../../../shared/utils/formatName";

function loadStoredUser(): DisplayUser | null {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function toDisplayUser(p: TherapistProfile): DisplayUser {
  return {
    id: p.user_id,
    email: p.email,
    name: formatName(p.f_name, p.m_name, p.l_name),
    role: p.role ?? "THERAPIST",
    profileImage: p.profile_image ?? null,
  };
}

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<DisplayUser | null>(loadStoredUser);
  const [profile, setProfile] = useState<TherapistProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const persistUser = useCallback((displayUser: DisplayUser) => {
    setUser(displayUser);
    localStorage.setItem("user", JSON.stringify(displayUser));
  }, []);

  const fetchProfile = useCallback(async (): Promise<ProfileResult> => {
    try {
      const res = await authApi.getProfile();
      setProfile(res.data);
      persistUser(toDisplayUser(res.data));
      return { ok: true, data: res.data };
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to load profile";
      setError(message);
      return { ok: false, error: message };
    }
  }, [persistUser]);

  // Load the full profile once there is a logged-in user
  useEffect(() => {
    if (localStorage.getItem("user_token")) {
      fetchProfile();
    }
  }, [fetchProfile]);

  const updateProfile = useCallback(async (data: UpdateProfileData): Promise<ProfileResult> => {
    try {
      const res = await authApi.updateProfile(data);
      setProfile(res.data);
      persistUser(toDisplayUser(res.data));
      return { ok: true, data: res.data };
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to update profile";
      setError(message);
      return { ok: false, error: message };
    }
  }, [persistUser]);

  const setProfileImage = useCallback(async (profileImage: string | null): Promise<ProfileResult> => {
    return updateProfile({ profile_image: profileImage });
  }, [updateProfile]);

  const login = useCallback(async (email: string, password: string): Promise<AuthResult> => {
    setLoading(true);
    setError(null);

    try {
      const res = await authApi.login(email, password);
      const displayUser = {
        id: res.data.user.user_id,
        email: res.data.user.email,
        name: formatName(res.data.user.f_name, res.data.user.m_name, res.data.user.l_name),
        role: res.data.user.role ?? "THERAPIST",
        profileImage: null,
      };
      localStorage.setItem("user_token", res.data.token);
      persistUser(displayUser);
      setLoading(false);
      // Non-blocking — fills profileImage + profile for sidebar
      fetchProfile();
      return { ok: true, data: { token: res.data.token, user: displayUser } };
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Login failed";
      setError(message);
      setLoading(false);
      return { ok: false };
    }
  }, [persistUser, fetchProfile]);

  const register = useCallback(async (payload: RegisterPayload): Promise<AuthResult> => {
    setLoading(true);
    setError(null);

    try {
      await authApi.register({
        email: payload.email,
        password: payload.password,
        f_name: payload.f_name,
        m_name: payload.m_name,
        l_name: payload.l_name,
        accepted_terms: payload.accepted_terms,
        terms_version: payload.terms_version,
        profession: payload.profession,
        license_number: payload.license_number,
        license_name: payload.license_name,
      });

      const loginRes = await authApi.login(payload.email, payload.password);
      const displayUser = {
        id: loginRes.data.user.user_id,
        email: loginRes.data.user.email,
        name: formatName(loginRes.data.user.f_name, loginRes.data.user.m_name, loginRes.data.user.l_name),
        role: loginRes.data.user.role ?? "THERAPIST",
        profileImage: null,
      };
      localStorage.setItem("user_token", loginRes.data.token);
      persistUser(displayUser);
      setLoading(false);
      fetchProfile();
      return { ok: true, data: { token: loginRes.data.token, user: displayUser } };
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Registration failed";
      setError(message);
      setLoading(false);
      return { ok: false };
    }
  }, [persistUser, fetchProfile]);

  const clearUser = useCallback(() => {
    localStorage.removeItem("user_token");
    localStorage.removeItem("user");
    setUser(null);
    setProfile(null);
    authApi.logout().catch(() => {});
  }, []);

  const value = useMemo(
    () => ({ user, profile, loading, error, clearError, fetchProfile, updateProfile, setProfileImage, login, register, clearUser }),
    [user, profile, loading, error, clearError, fetchProfile, updateProfile, setProfileImage, login, register, clearUser],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};
