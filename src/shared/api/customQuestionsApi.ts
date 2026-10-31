import { httpClient } from "./httpClient";

export interface CustomQuestion {
  id: number;
  therapist_id: number;
  text: string;
  category: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// httpClient already unwraps the { status, message, data } envelope: res.data is the payload.

export async function getCustomQuestions(): Promise<CustomQuestion[]> {
  const res = await httpClient.get<CustomQuestion[]>("/api/custom-questions");
  const payload = res.data;
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object" && "data" in payload && Array.isArray((payload as any).data)) return (payload as any).data;
  return [];
}

export async function getCustomQuestion(id: number): Promise<CustomQuestion> {
  const res = await httpClient.get<CustomQuestion>(`/api/custom-questions/${id}`);
  return res.data;
}

export async function createCustomQuestion(data: {
  text: string;
  category?: string;
}): Promise<CustomQuestion> {
  const res = await httpClient.post<CustomQuestion>("/api/custom-questions", data);
  return res.data;
}

export async function updateCustomQuestion(
  id: number,
  data: { text?: string; category?: string },
): Promise<CustomQuestion> {
  const res = await httpClient.patch<CustomQuestion>(`/api/custom-questions/${id}`, data);
  return res.data;
}

export async function deactivateCustomQuestion(id: number): Promise<CustomQuestion> {
  const res = await httpClient.patch<CustomQuestion>(`/api/custom-questions/${id}/deactivate`);
  return res.data;
}

export async function deleteCustomQuestion(id: number): Promise<{ deleted: boolean }> {
  const res = await httpClient.delete<{ deleted: boolean }>(`/api/custom-questions/${id}`);
  return res.data;
}
