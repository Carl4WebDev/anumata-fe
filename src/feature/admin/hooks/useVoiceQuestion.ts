import { useCallback, useEffect, useRef, useState } from "react";
import { transcribeAudio } from "../../../shared/api/sttApi";
import {
  browserCaptionsUsable,
  FATAL_SPEECH_ERRORS,
  getSpeechRecognition,
  type SpeechRecognizer,
} from "../../interview/hooks/browserSpeech";

export type VoiceMode = "idle" | "listening" | "recording" | "transcribing";

/** No words back after this long → the browser's recognition isn't working here (e.g. Brave). */
export const DEAF_BROWSER_MS = 7000;
/** A spoken question is short; recording stops by itself after this. */
export const MAX_RECORDING_MS = 20000;

/**
 * Asks a question by voice, in English. Uses the browser's speech recognition
 * (words appear while speaking); where that doesn't work, records the question
 * and transcribes it with Amumata's Whisper instead.
 */
export function useVoiceQuestion(onText: (text: string) => void) {
  const [mode, setMode] = useState<VoiceMode>("idle");
  const [error, setError] = useState<string | null>(null);
  const recognizerRef = useRef<SpeechRecognizer | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const useWhisperRef = useRef(!browserCaptionsUsable());
  const onTextRef = useRef(onText);
  useEffect(() => {
    onTextRef.current = onText;
  }, [onText]);

  const clearTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  };

  const transcribe = useCallback(async (blob: Blob) => {
    setMode("transcribing");
    try {
      const result = await transcribeAudio(blob, { purpose: "caption", languageHint: "en", timeoutMs: 180000 });
      if (result.text.trim()) onTextRef.current(result.text.trim());
      else setError("Couldn't hear a question. Try again, or type it.");
    } catch {
      setError("Couldn't turn your voice into text right now. Please type your question.");
    } finally {
      setMode("idle");
    }
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        clearTimer();
        stream.getTracks().forEach((track) => track.stop());
        recorderRef.current = null;
        void transcribe(new Blob(chunks, { type: recorder.mimeType || "audio/webm" }));
      };
      recorderRef.current = recorder;
      recorder.start();
      setMode("recording");
      timerRef.current = setTimeout(() => recorder.stop(), MAX_RECORDING_MS);
    } catch {
      setMode("idle");
      setError("The microphone isn't available. Allow it in the browser, or type your question.");
    }
  }, [transcribe]);

  const switchToWhisper = useCallback(() => {
    useWhisperRef.current = true;
    clearTimer();
    const recognizer = recognizerRef.current;
    recognizerRef.current = null;
    if (recognizer) {
      recognizer.onend = null;
      recognizer.abort();
    }
    void startRecording();
  }, [startRecording]);

  const startBrowser = useCallback(() => {
    const Recognition = getSpeechRecognition();
    if (!Recognition) return switchToWhisper();
    const recognizer = new Recognition();
    recognizer.lang = "en-US";
    recognizer.continuous = false;
    recognizer.interimResults = true;
    recognizer.maxAlternatives = 1;
    recognizer.onresult = (e) => {
      clearTimer();
      const words = Array.from({ length: e.results.length }, (_, i) => e.results[i][0].transcript).join("");
      onTextRef.current(words.trim());
    };
    recognizer.onerror = (e) => {
      if (e.error === "not-allowed") setError("The microphone is blocked. Allow it in the browser, or type your question.");
      else if (FATAL_SPEECH_ERRORS.has(e.error)) switchToWhisper();
    };
    recognizer.onend = () => {
      clearTimer();
      recognizerRef.current = null;
      setMode("idle");
    };
    recognizerRef.current = recognizer;
    recognizer.start();
    setMode("listening");
    timerRef.current = setTimeout(switchToWhisper, DEAF_BROWSER_MS);
  }, [switchToWhisper]);

  const start = useCallback(() => {
    setError(null);
    if (useWhisperRef.current) void startRecording();
    else startBrowser();
  }, [startBrowser, startRecording]);

  const stop = useCallback(() => {
    clearTimer();
    recognizerRef.current?.stop();
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }, []);

  useEffect(
    () => () => {
      clearTimer();
      recognizerRef.current?.abort();
      const recorder = recorderRef.current;
      if (recorder?.state === "recording") {
        recorder.onstop = null;
        recorder.stop();
        recorder.stream.getTracks().forEach((track) => track.stop());
      }
    },
    [],
  );

  return { mode, error, start, stop };
}
