const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export interface WhisperResult {
  text: string;
  language: string;
  language_probability: number;
  duration: number;
  processing_time: number;
}

/**
 * Send audio blob to backend for Whisper transcription.
 * Backend proxies to Python AI service at /api/stt/transcribe.
 */
export async function transcribeAudio(audioBlob: Blob): Promise<WhisperResult> {
  const formData = new FormData();
  formData.append("file", audioBlob, "rapport_audio.webm");

  const controller = new AbortController();
  // First transcribe can be slow (Whisper model load / VRAM contention with
  // the other models). An aborted call loses the patient's answer outright.
  const timeout = setTimeout(() => controller.abort(), 60000);

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