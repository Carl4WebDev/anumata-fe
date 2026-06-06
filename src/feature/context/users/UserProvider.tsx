import { useState, useCallback, useMemo } from "react";
import { UserContext } from "./UserContext";

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    await new Promise((r) => setTimeout(r, 500));

    if (!email || !password) {
      setError("Email and password are required");
      setLoading(false);
      return { ok: false };
    }

    const user = { id: 1, email, name: "Dr. Maria Reyes", role: "therapist" };
    localStorage.setItem("user_token", "simulated-token-" + Date.now());
    localStorage.setItem("user", JSON.stringify(user));
    setLoading(false);
    return { ok: true, data: { token: "simulated", user } };
  }, []);

  const register = useCallback(async (payload: { email: string; name: string; password: string }) => {
    setLoading(true);
    setError(null);
    await new Promise((r) => setTimeout(r, 500));

    if (!payload.email || !payload.password || !payload.name) {
      setError("All fields are required");
      setLoading(false);
      return { ok: false };
    }

    const user = { id: 1, email: payload.email, name: payload.name, role: "therapist" };
    localStorage.setItem("user_token", "simulated-token-" + Date.now());
    localStorage.setItem("user", JSON.stringify(user));
    setLoading(false);
    return { ok: true, data: { token: "simulated", user } };
  }, []);

  const clearUser = useCallback(() => {
    localStorage.removeItem("user_token");
    localStorage.removeItem("user");
  }, []);

  const value = useMemo(
    () => ({ loading, error, clearError, login, register, clearUser }),
    [loading, error, clearError, login, register, clearUser],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};
