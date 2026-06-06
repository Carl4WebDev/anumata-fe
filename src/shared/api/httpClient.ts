const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

interface ApiResponse<T> {
  status: string;
  message: string;
  data: T;
  meta?: Record<string, unknown> | null;
}

class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = localStorage.getItem("user_token");

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(
      data.message || "Request failed",
      response.status,
      data.code
    );
  }

  return data;
}

export const httpClient = {
  get<T>(endpoint: string) {
    return request<T>(endpoint, { method: "GET" });
  },

  post<T>(endpoint: string, body?: unknown) {
    return request<T>(endpoint, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  patch<T>(endpoint: string, body?: unknown) {
    return request<T>(endpoint, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  delete<T>(endpoint: string) {
    return request<T>(endpoint, { method: "DELETE" });
  },
};

export { ApiError };
export type { ApiResponse };
