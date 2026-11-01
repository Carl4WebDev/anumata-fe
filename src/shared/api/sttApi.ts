const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export interface WhisperResult {
  text: string;
  language: string;
  language_probability: number;
  duration: number;
  processing_time: number;
}

export interface TranscribeOptions {
  /** "caption" = fast mode for live-caption phrases. */
  purpose?: "caption" | "rapport";
  /** Patient's known language, keeps short phrases from flipping language. */
  languageHint?: "en" | "tl" | "ceb";
  timeoutMs?: number;
}

/**
 * Send audio blob to backend for Whisper transcription.
 * Backend proxies to Python AI service at /api/stt/transcribe.
 */
export async function transcribeAudio(audioBlob: Blob, options: TranscribeOptions = {}): Promise<WhisperResult> {
  const formData = new FormData();
  formData.append("file", audioBlob, options.purpose === "caption" ? "caption.webm" : "rapport_audio.webm");
  if (options.purpose) formData.append("purpose", options.purpose);
  if (options.languageHint) formData.append("language_hint", options.languageHint);

  const controller = new AbortController();
  // First transcribe can be slow (Whisper model load / VRAM contention with
  // the other models). An aborted call loses the patient's answer outright.
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 60000);

  try {
    const response = await fetch(`${API_BASE}/api/stt/transcribe`, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });

    const json = await response.json();
    if (!response.ok) {
      throw new Error(json.detail || json.message || "Transcription failed");
    }

    return json.data || json;
  } finally {
    clearTimeout(timeout);
  }
}