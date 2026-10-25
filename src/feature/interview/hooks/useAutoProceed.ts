import { useRef, useCallback, useEffect } from "react";
import { useWhisperSTT } from "./useWhisperSTT";

export type AutoProceedPhase = "idle" | "listening" | "processing" | "done";

interface UseAutoProceedOptions {
  /** The media stream from the user's camera/mic. */
  stream: MediaStream | null;
  /** Called with the final transcript and Whisper-detected language. */
  onTranscript: (text: string, language: string) => void;
  /** Called when an error occurs or no speech detected. */
  onError: (message: string) => void;
  /** Feature flag — false disables all auto-proceed. */
  enabled: boolean;
  /** Max retries on no-speech before giving up. Default: 1. */
  maxRetries?: number;
}

/**
 * Orchestrator hook for auto-proceeding rapport.
 *
 * Flow: TTS ends → startListening → silence detected → Whisper STT → onTranscript
 * On error/no-speech: retries once, then falls back to manual mode via onError.
 *
 * All existing buttons remain as override — call cancel() when user interacts
 * manually, or stopListening() to end the recording early and keep the audio.
 */
export function useAutoProceed(options: UseAutoProceedOptions) {
  const { stream, onTranscript, onError, enabled, maxRetries = 1 } = options;

  const whisperSTT = useWhisperSTT(stream, {
    silenceThreshold: 0.015,
    silenceMs: 2000,
    maxDurationMs: 30000,
  });

  const retryCountRef = useRef(0);
  const onTranscriptRef = useRef(onTranscript);
  const onErrorRef = useRef(onError);
  const enabledRef = useRef(enabled);
  // Deliver each transcript exactly once — the effect below can re-run when
  // a sibling state (e.g. language) settles on a later render.
  const deliveredTranscriptRef = useRef("");
  // useWhisperSTT returns a fresh object every render — keeping it in a ref
  // stops the delivery effects below from re-subscribing every render.
  const whisperSTTRef = useRef(whisperSTT);
  useEffect(() => { whisperSTTRef.current = whisperSTT; });
  useEffect(() => { onTranscriptRef.current = onTranscript; }, [onTranscript]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);
  useEffect(() => { enabledRef.current = enabled; }, [enabled]);

  // When whisperSTT finishes processing and has a transcript, deliver it
  useEffect(() => {
    if (!enabledRef.current) return;
    if (whisperSTT.status === "idle" && whisperSTT.transcript) {
      if (deliveredTranscriptRef.current === whisperSTT.transcript) return;
      deliveredTranscriptRef.current = whisperSTT.transcript;
      retryCountRef.current = 0;
      onTranscriptRef.current(whisperSTT.transcript, whisperSTT.language);
    }
  }, [whisperSTT.status, whisperSTT.transcript, whisperSTT.language]);

  // When whisperSTT errors, retry or fall back
  useEffect(() => {
    if (!enabledRef.current) return;
    if (whisperSTT.status === "error" && whisperSTT.error) {
      if (retryCountRef.current < maxRetries) {
        retryCountRef.current++;
        // Retry: reset and re-record after a short delay
        whisperSTTRef.current.reset();
        setTimeout(() => {
          if (enabledRef.current) {
            deliveredTranscriptRef.current = "";
            whisperSTTRef.current.startRecording();
          }
        }, 500);
      } else {
        retryCountRef.current = 0;
        onErrorRef.current(whisperSTT.error);
      }
    }
  }, [whisperSTT.status, whisperSTT.error, maxRetries]);

  const startListening = useCallback(() => {
    if (!enabledRef.current) return;
    retryCountRef.current = 0;
    deliveredTranscriptRef.current = "";
    whisperSTTRef.current.reset();
    whisperSTTRef.current.startRecording();
  }, []);

  /** End the recording early — the audio captured so far is still transcribed. */
  const stopListening = useCallback(() => {
    whisperSTTRef.current.stopRecording();
  }, []);

  const cancel = useCallback(() => {
    retryCountRef.current = 0;
    whisperSTTRef.current.cancel();
  }, []);

  // Map whisperSTT status to auto-proceed phase
  let phase: AutoProceedPhase = "idle";
  if (whisperSTT.status === "recording") phase = "listening";
  else if (whisperSTT.status === "processing") phase = "processing";
  else if (whisperSTT.status === "idle" && whisperSTT.transcript) phase = "done";

  return {
    phase,
    error: whisperSTT.error,
    startListening,
    stopListening,
    cancel,
    isSupported: whisperSTT.isSupported,
    isListening: phase === "listening",
    isProcessing: phase === "processing",
    whisperError: whisperSTT.error,
    whisperLanguage: whisperSTT.language,
    whisperInterim: "",
  };
}
