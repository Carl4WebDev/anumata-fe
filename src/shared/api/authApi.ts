import { httpClient } from "./httpClient";

export interface LoginResponse {
  token: string;
  user: { user_id: number; email: string; f_name: string; m_name: string | null; l_name: string };
}

export interface RegisterResponse {
  user_id: number;
  email: string;
  f_name: string;
  m_name: string | null;
  l_name: string;
}

export const authApi = {
  login(email: string, password: string) {
    return httpClient.post<LoginResponse>("/api/auth/login", { email, password });
  },

  register(data: { email: string; password: string; f_name: string; m_name?: string; l_name: string }) {
    return httpClient.post<RegisterResponse>("/api/auth/register", data);
  },

  getProfile() {
    return httpClient.get<{ user_id: number; email: string; f_name: string; m_name: string | null; l_name: string }>("/api/auth/profile");
  },

  updateProfile(data: { f_name: string; m_name?: string; l_name: string }) {
    return httpClient.patch<{ user_id: number; email: string; f_name: string; m_name: string | null; l_name: string }>("/api/auth/profile", data);
  },

  changePassword(current_password: string, new_password: string) {
    return httpClient.patch<{ message: string }>("/api/auth/profile/password", { current_password, new_password });
  },

  logout() {
    return httpClient.post<{ message: string }>("/api/auth/logout");
  },
};