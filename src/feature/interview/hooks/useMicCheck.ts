import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Microphone check on the start screen: "say hello — the bars should move".
 * Catches a muted or wrong microphone before the interview starts.
 *
 * "listening" = waiting to hear the patient; "heard" = their voice came through;
 * "silent" = nothing heard for a while (wrong / muted mic?); "unavailable" = no
 * microphone to test.
 */
export type MicCheckStatus = "listening" | "heard" | "silent" | "unavailable";

export const MIC_SILENT_HINT_MS = 8000;
const POLL_MS = 100;
// A bit above the captions' voice floor (0.012), so room noise doesn't count.
const VOICE_LEVEL = 0.02;
// Voice must last this long — a click or a bump isn't a working mic.
const VOICED_MS_NEEDED = 300;

/** RMS (0–1) of the analyser's current waveform. */
export function readRms(analyser: AnalyserNode): number {
  const data = new Uint8Array(analyser.fftSize);
  analyser.getByteTimeDomainData(data);
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    const sample = (data[i] - 128) / 128;
    sum += sample * sample;
  }
  return Math.sqrt(sum / data.length);
}

export function useMicCheck(stream: MediaStream | null, active: boolean) {
  const [status, setStatus] = useState<MicCheckStatus>("listening");
  const levelRef = useRef(0);

  useEffect(() => {
    if (!active || !stream) return;
    if (stream.getAudioTracks().length === 0 || typeof AudioContext === "undefined") {
      setStatus("unavailable");
      return;
    }

    let ctx: AudioContext;
    let source: MediaStreamAudioSourceNode;
    let analyser: AnalyserNode;
    try {
      ctx = new AudioContext();
      analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);
      if (ctx.state === "suspended") ctx.resume().catch(() => {});
    } catch {
      setStatus("unavailable");
      return;
    }

    setStatus("listening");
    const startedAt = Date.now();
    let voicedMs = 0;
    let heard = false;
    const interval = setInterval(() => {
      const level = readRms(analyser);
      levelRef.current = level;
      voicedMs = level >= VOICE_LEVEL ? voicedMs + POLL_MS : 0;
      if (!heard && voicedMs >= VOICED_MS_NEEDED) {
        heard = true;
        setStatus("heard");
      } else if (!heard && Date.now() - startedAt >= MIC_SILENT_HINT_MS) {
        setStatus("silent");
      }
    }, POLL_MS);

    return () => {
      clearInterval(interval);
      levelRef.current = 0;
      source.disconnect();
      ctx.close().catch(() => {});
    };
  }, [stream, active]);

  const getLevel = useCallback(() => levelRef.current, []);
  return { status, getLevel };
}
