/**
 * Minimal typing for the browser's Web Speech recognition (Chrome / Edge /
 * Safari expose it as SpeechRecognition or webkitSpeechRecognition). It gives
 * word-by-word captions instantly; recognition runs on the browser vendor's
 * speech service.
 */

export interface SpeechAlternative {
  transcript: string;
}

export interface SpeechResult {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: SpeechAlternative;
}

export interface SpeechResultEvent {
  readonly resultIndex: number;
  readonly results: { readonly length: number; [index: number]: SpeechResult };
}

export interface SpeechErrorEvent {
  readonly error: string;
}

export interface SpeechRecognizer {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: SpeechResultEvent) => void) | null;
  onerror: ((e: SpeechErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

type RecognizerConstructor = new () => SpeechRecognizer;

/**
 * Browser captions send the patient's voice to the browser vendor (Google for
 * Chrome, Microsoft for Edge). Set VITE_CAPTION_ENGINE=whisper to turn them
 * off: captions then come only from Amumata's own AI service.
 */
export function browserCaptionsAllowed(): boolean {
  return import.meta.env.VITE_CAPTION_ENGINE !== "whisper";
}

export function getSpeechRecognition(): RecognizerConstructor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognizerConstructor;
    webkitSpeechRecognition?: RecognizerConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/**
 * Recognition locale for the patient's language. Filipino ("fil-PH") also
 * copes with Taglish and English words, so it is the default until the
 * patient is known to speak English. Bisaya has no browser model — Filipino
 * is the closest (the analysis still uses Whisper on the recorded audio).
 */
export function recognitionLocale(language?: "en" | "tl" | "ceb"): string {
  return language === "en" ? "en-US" : "fil-PH";
}

/** Errors after which browser recognition can't work here — fall back to Whisper. */
export const FATAL_SPEECH_ERRORS = new Set([
  "not-allowed",
  "service-not-allowed",
  "network",
  "language-not-supported",
  "audio-capture",
]);
