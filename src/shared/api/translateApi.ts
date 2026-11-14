const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export type QuestionLanguage = "tl" | "ceb";

/**
 * The saved translations of an interview's questions in one language, as
 * { English text: translation } — reviewed by the therapist, prepared drafts,
 * or AI translations kept from earlier interviews. {} on any failure.
 */
export async function fetchSavedTranslations(token: string, lang: QuestionLanguage): Promise<Record<string, string>> {
  try {
    const response = await fetch(`${API_BASE}/api/translations/interview/${encodeURIComponent(token)}?lang=${lang}`, {
      signal: AbortSignal.timeout(8000),
    });
    const json = await response.json();
    return response.ok && json.data?.translations ? (json.data.translations as Record<string, string>) : {};
  } catch {
    return {};
  }
}

/**
 * Translate one of the interview's questions with the AI; the server keeps the
 * result so the next interview has it at once. null on any failure (ask in English).
 */
export async function translateForInterview(token: string, text: string, lang: QuestionLanguage): Promise<string | null> {
  try {
    const response = await fetch(`${API_BASE}/api/translations/interview/${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, lang }),
      signal: AbortSignal.timeout(20000),
    });
    const json = await response.json();
    return response.ok && json.data?.translated ? (json.data.translated as string) : null;
  } catch {
    return null;
  }
}

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
