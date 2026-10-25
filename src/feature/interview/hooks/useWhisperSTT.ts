import { useState, useRef, useCallback, useEffect } from "react";
import { transcribeAudio } from "../../../shared/api/sttApi";

export type WhisperSTTStatus = "idle" | "recording" | "processing" | "error";

interface UseWhisperSTTOptions {
  /** Silence RMS threshold (0-1). Below this = silence. */
  silenceThreshold?: number;
  /** Milliseconds of silence AFTER speech started before auto-stop. */
  silenceMs?: number;
  /** Hard cap on recording length in ms. */
  maxDurationMs?: number;
}

export interface SilenceTrackerConfig {
  silenceThreshold: number;
  silenceMs: number;
  maxDurationMs: number;
}

export type SilenceDecision = "continue" | "stop";

/**
 * Pure silence-decision state machine. The trailing-silence countdown starts
 * only AFTER speech onset — a patient who takes a moment to think must never
 * be cut off before they speak. Always stops at maxDurationMs.
 */
export function createSilenceTracker(config: SilenceTrackerConfig) {
  let speechStarted = false;
  let silenceSinceMs: number | null = null;

  return {
    feed(rms: number, elapsedMs: number): SilenceDecision {
      if (elapsedMs >= config.maxDurationMs) return "stop";
      if (rms >= config.silenceThreshold) {
        speechStarted = true;
        silenceSinceMs = null;
        return "continue";
      }
      if (!speechStarted) return "continue";
      if (silenceSinceMs === null) {
        silenceSinceMs = elapsedMs;
        return "continue";
      }
      return elapsedMs - silenceSinceMs >= config.silenceMs ? "stop" : "continue";
    },
    get speechStarted() {
      return speechStarted;
    },
  };
}

/**
 * Hook that records audio from a MediaStream, detects silence via RMS,
 * then sends the recording to Whisper backend for transcription.
 *
 * Supports Bisaya, Tagalog, English, and mixed speech (auto-detected by Whisper).
 */
export function useWhisperSTT(
  stream: MediaStream | null,
  options: UseWhisperSTTOptions = {}
) {
  const { silenceThreshold = 0.015, silenceMs = 2000, maxDurationMs = 30000 } = options;

  const [status, setStatus] = useState<WhisperSTTStatus>("idle");
  const [transcript, setTranscript] = useState("");
  const [language, setLanguage] = useState("");
  const [error, setError] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeRef = useRef(false);

  const cleanup = useCallback(() => {
    activeRef.current = false;
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try { mediaRecorderRef.current.stop(); } catch { /* already stopped */ }
    }
    mediaRecorderRef.current = null;
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const computeRMS = useCallback((): number => {
    const analyser = analyserRef.current;
    if (!analyser) return 0;
    const data = new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const sample = (data[i] - 128) / 128;
      sum += sample * sample;
    }
    return Math.sqrt(sum / data.length);
  }, []);

  const startRecording = useCallback(() => {
    if (!stream) {
      setError("No microphone stream available.");
      setStatus("error");
      return;
    }
    if (activeRef.current) return;

    cleanup();
    setTranscript("");
    setLanguage("");
    setError("");
    activeRef.current = true;

    // Set up MediaRecorder
    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) {
      setError("No audio track in stream.");
      setStatus("error");
      activeRef.current = false;
      return;
    }

    const audioStream = new MediaStream(audioTracks);
    const recorder = new MediaRecorder(audioStream, { mimeType: "audio/webm" });
    audioChunksRef.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunksRef.current.push(e.data);
    };

    recorder.onstop = async () => {
      if (!activeRef.current) return;
      const chunks = [...audioChunksRef.current];
      audioChunksRef.current = [];

      if (chunks.length === 0) {
        setError("No audio captured. Please try again.");
        setStatus("error");
        activeRef.current = false;
        return;
      }

      const blob = new Blob(chunks, { type: "audio/webm" });
      setStatus("processing");

      try {
        const result = await transcribeAudio(blob);
        if (!activeRef.current) return;

        const text = result.text?.trim() || "";
        if (!text || text === "[No speech detected]" || text === "[Transcription failed]") {
          setError("I didn't hear anything. Please try again.");
          setStatus("error");
          activeRef.current = false;
          return;
        }

        setTranscript(text);
        setLanguage(result.language || "");
        setStatus("idle");
        activeRef.current = false;
      } catch (err) {
        if (!activeRef.current) return;
        setError(err instanceof Error ? err.message : "Transcription failed. Please type your response.");
        setStatus("error");
        activeRef.current = false;
      }
    };

    mediaRecorderRef.current = recorder;
    recorder.start(100); // collect data every 100ms
    setStatus("recording");

    // Silence detection via AudioContext — pure tracker decides stop.
    try {
      const ctx = new AudioContext();
      audioContextRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;

      const tracker = createSilenceTracker({ silenceThreshold, silenceMs, maxDurationMs });
      const startedAt = Date.now();

      pollIntervalRef.current = setInterval(() => {
        if (!activeRef.current) return;
        const decision = tracker.feed(computeRMS(), Date.now() - startedAt);
        if (decision === "stop" && mediaRecorderRef.current?.state === "recording") {
          mediaRecorderRef.current.stop();
        }
      }, 100);
    } catch {
      // AudioContext not available — record without silence detection.
      // The manual stop button still ends the recording.
    }
  }, [stream, cleanup, computeRMS, silenceThreshold, silenceMs, maxDurationMs]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    // Cleanup silence detection but keep recorder alive for onstop
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
  }, []);

  const cancel = useCallback(() => {
    cleanup();
    setStatus("idle");
    setTranscript("");
    setLanguage("");
    setError("");
  }, [cleanup]);

  const reset = useCallback(() => {
    cleanup();
    setStatus("idle");
    setTranscript("");
    setLanguage("");
    setError("");
  }, [cleanup]);

  return {
    status,
    transcript,
    language,
    error,
    startRecording,
    stopRecording,
    cancel,
    reset,
    isSupported: !!stream && stream.getAudioTracks().length > 0,
  };
}
