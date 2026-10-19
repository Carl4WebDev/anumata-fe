import { useState, useRef, useCallback, useEffect } from "react";

type SpeechRecognitionStatus = "idle" | "listening" | "processing" | "error";

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorLike) => void) | null;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    0: { transcript: string };
  }>;
}

interface SpeechRecognitionErrorLike {
  error: string;
}

function getSpeechRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  return (
    (w.SpeechRecognition as new () => SpeechRecognitionLike) ??
    (w.webkitSpeechRecognition as new () => SpeechRecognitionLike) ??
    null
  );
}

const ERROR_MESSAGES: Record<string, string> = {
  "not-allowed":
    "Microphone access was denied. Please allow microphone access, or type your response below.",
  "service-not-allowed":
    "Speech recognition is blocked in this browser. Please type your response below.",
  "audio-capture":
    "No microphone was found. Check your microphone, or type your response below.",
  network:
    "Speech recognition had a connection problem. Try again, or type your response below.",
};

const GENERIC_ERROR =
  "Speech recognition had a problem. Try again, or type your response below.";
const EMPTY_ERROR = "Didn't catch that. Try again, or type your response below.";

/**
 * Browser-native speech recognition (Web Speech API) for rapport voice input.
 *
 * Limitations: accuracy is not guaranteed for English, Filipino, Bisaya, or
 * Taglish — this is not a tested transcription service. In Chrome the Web Speech
 * API sends audio to the browser vendor's servers, so it is NOT local or private.
 * Never run alongside useTTS speech — stop one before starting the other.
 */
export function useSpeechRecognition() {
  const [status, setStatus] = useState<SpeechRecognitionStatus>("idle");
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState("");

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const capturedRef = useRef(false);
  const errorRef = useRef("");

  const isSupported = !!getSpeechRecognitionCtor();

  // Detach handlers and stop any active recognition.
  const teardown = useCallback((method: "stop" | "abort") => {
    const rec = recognitionRef.current;
    recognitionRef.current = null;
    if (!rec) return;
    rec.onstart = null;
    rec.onresult = null;
    rec.onend = null;
    rec.onerror = null;
    try {
      method === "stop" ? rec.stop() : rec.abort();
    } catch {
      // already stopped
    }
  }, []);

  // Stop on unmount so the mic is never left running.
  useEffect(() => {
    return () => teardown("abort");
  }, [teardown]);

  const start = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      const msg = "Speech recognition is not supported in this browser. Please type your response below.";
      errorRef.current = msg;
      setError(msg);
      setStatus("error");
      return;
    }

    // Drop any previous session.
    teardown("abort");
    capturedRef.current = false;
    errorRef.current = "";
    setTranscript("");
    setInterimTranscript("");
    setError("");

    const rec = new Ctor();
    rec.continuous = false;
    rec.interimResults = true;
    // Default language only. Not verified for Filipino, Bisaya, or Taglish.
    rec.lang = "en-US";

    rec.onstart = () => setStatus("listening");

    rec.onresult = (event) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0]?.transcript ?? "";
        if (result.isFinal) final += text;
        else interim += text;
      }
      const finalText = final.trim();
      if (finalText) {
        capturedRef.current = true;
        setTranscript((prev) => (prev ? `${prev} ${finalText}` : finalText));
      }
      setInterimTranscript(interim.trim());
    };

    rec.onerror = (event) => {
      const code = event.error;
      if (code === "aborted") {
        // Deliberate stop/abort — not an error.
        return;
      }
      const msg = ERROR_MESSAGES[code] ?? GENERIC_ERROR;
      errorRef.current = msg;
      setError(msg);
      setStatus("error");
    };

    rec.onend = () => {
      setInterimTranscript("");
      if (errorRef.current) {
        setStatus("error");
      } else if (!capturedRef.current) {
        // Ended with no usable speech — say so, never invent a transcript.
        errorRef.current = EMPTY_ERROR;
        setError(EMPTY_ERROR);
        setStatus("error");
      } else {
        setStatus("idle");
      }
    };

    recognitionRef.current = rec;
    try {
      rec.start();
    } catch {
      const msg = GENERIC_ERROR;
      errorRef.current = msg;
      setError(msg);
      setStatus("error");
    }
  }, [teardown]);

  // Graceful stop — waits for the final result.
  const stop = useCallback(() => {
    const rec = recognitionRef.current;
    if (!rec) return;
    setStatus("processing");
    try {
      rec.stop();
    } catch {
      // already stopped
    }
  }, []);

  // Immediate stop that discards in-flight results (use before TTS).
  const abort = useCallback(() => {
    teardown("abort");
    setInterimTranscript("");
    setStatus("idle");
  }, [teardown]);

  const reset = useCallback(() => {
    teardown("abort");
    setTranscript("");
    setInterimTranscript("");
    setError("");
    errorRef.current = "";
    capturedRef.current = false;
    setStatus("idle");
  }, [teardown]);

  return {
    start,
    stop,
    abort,
    reset,
    isSupported,
    status,
    transcript,
    interimTranscript,
    error,
  };
}
