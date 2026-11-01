import { httpClient } from "./httpClient";

export interface StandardizedQuestion {
  id: number;
  question_code: string;
  text: string;
  category: string;
  version: number;
  review_status: string;
  reviewer_name: string | null;
  reviewer_credentials: string | null;
  review_date: string | null;
  review_notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export async function getStandardizedQuestions(category?: string): Promise<StandardizedQuestion[]> {
  const params = category ? `?category=${encodeURIComponent(category)}` : "";
  const res = await httpClient.get<StandardizedQuestion[]>(`/api/standardized-questions${params}`);
  const payload = res.data;
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object" && "data" in payload && Array.isArray((payload as any).data)) return (payload as any).data;
  return [];
}

export async function getStandardizedQuestion(id: number): Promise<StandardizedQuestion> {
  const res = await httpClient.get<StandardizedQuestion>(`/api/standardized-questions/${id}`);
  return res.data as unknown as StandardizedQuestion;
}