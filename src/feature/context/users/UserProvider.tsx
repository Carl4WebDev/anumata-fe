import { useState, useCallback, useMemo } from "react";
import { UserContext } from "./UserContext";
import { authApi } from "../../../shared/api/authApi";
import { ApiError } from "../../../shared/api/httpClient";
import { formatName } from "../../../shared/utils/formatName";

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setError(null);

    try {
      const res = await authApi.login(email, password);
      const user = {
        id: res.data.user.user_id,
        email: res.data.user.email,
        name: formatName(res.data.user.f_name, res.data.user.m_name, res.data.user.l_name),
        role: "THERAPIST",
      };
      localStorage.setItem("user_token", res.data.token);
      localStorage.setItem("user", JSON.stringify(user));
      setLoading(false);
      return { ok: true, data: { token: res.data.token, user } };
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Login failed";
      setError(message);
      setLoading(false);
      return { ok: false };
    }
  }, []);

  const register = useCallback(async (payload: { email: string; f_name: string; m_name?: string; l_name: string; password: string }) => {
    setLoading(true);
    setError(null);

    try {
      await authApi.register({
        email: payload.email,
        password: payload.password,
        f_name: payload.f_name,
        m_name: payload.m_name,
        l_name: payload.l_name,
      });

      const loginRes = await authApi.login(payload.email, payload.password);
      const user = {
        id: loginRes.data.user.user_id,
        email: loginRes.data.user.email,
        name: formatName(loginRes.data.user.f_name, loginRes.data.user.m_name, loginRes.data.user.l_name),
        role: "THERAPIST",
      };
      localStorage.setItem("user_token", loginRes.data.token);
      localStorage.setItem("user", JSON.stringify(user));
      setLoading(false);
      return { ok: true, data: { token: loginRes.data.token, user } };
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Registration failed";
      setError(message);
      setLoading(false);
      return { ok: false };
    }
  }, []);

  const clearUser = useCallback(() => {
    localStorage.removeItem("user_token");
    localStorage.removeItem("user");
    authApi.logout().catch(() => {});
  }, []);

  const value = useMemo(
    () => ({ loading, error, clearError, login, register, clearUser }),
    [loading, error, clearError, login, register, clearUser],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};
