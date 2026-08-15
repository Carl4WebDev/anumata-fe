const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export interface SystemHealth {
  status: "ok" | "degraded";
  express: { status: string };
  database: { status: string };
  ai_service: {
    status: string;
    models: { fer: boolean; ser: boolean; ler: boolean; stt: boolean };
  };
  ollama: { status: string; model: string | null };
  timestamp: string;
}

export async function fetchSystemHealth(): Promise<SystemHealth> {
  const res = await fetch(`${API_BASE}/api/system/health`);
  if (!res.ok && res.status !== 207) {
    throw new Error(`Health check failed: ${res.status}`);
  }
  return res.json();
}
