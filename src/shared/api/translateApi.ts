const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export type QuestionLanguage = "tl" | "ceb";

/**
 * Translate an interview question via the backend AI service (Ollama).
 * Returns null on ANY failure — the caller falls back to the English
 * original so translation can never break the interview.
 */
export async function translateQuestion(
  text: string,
  target: QuestionLanguage
): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(`${API_BASE}/api/ai/translate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, target }),
      signal: controller.signal,
    });
    const json = await response.json();
    if (!response.ok || !json.data?.ok || !json.data?.translated) return null;
    return json.data.translated as string;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
