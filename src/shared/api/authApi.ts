import { httpClient } from "./httpClient";

export interface LoginResponse {
  token: string;
  user: { user_id: number; email: string; full_name: string };
}

export interface RegisterResponse {
  user_id: number;
  email: string;
  full_name: string;
}

export const authApi = {
  login(email: string, password: string) {
    return httpClient.post<LoginResponse>("/api/auth/login", { email, password });
  },

  register(data: { email: string; password: string; full_name: string }) {
    return httpClient.post<RegisterResponse>("/api/auth/register", data);
  },

  getProfile() {
    return httpClient.get<{ user_id: number; email: string; full_name: string }>("/api/auth/profile");
  },

  updateProfile(full_name: string) {
    return httpClient.patch<{ user_id: number; email: string; full_name: string }>("/api/auth/profile", { full_name });
  },

  changePassword(current_password: string, new_password: string) {
    return httpClient.patch<{ message: string }>("/api/auth/profile/password", { current_password, new_password });
  },

  logout() {
    return httpClient.post<{ message: string }>("/api/auth/logout");
  },
};
