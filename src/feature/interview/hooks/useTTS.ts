import { useState, useEffect, useRef, useCallback } from "react";

const PREFERRED_VOICES = [
  "Microsoft Zira",
  "Google UK English Female",
  "Google US English Female",
  "Samantha",
  "Karen",
  "Victoria",
];

function pickVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  // Try preferred names first
  for (const name of PREFERRED_VOICES) {
    const match = voices.find((v) => v.name.includes(name));
    if (match) return match;
  }
  // Fall back to any female voice
  const female = voices.find(
    (v) => v.name.toLowerCase().includes("female") || v.name.toLowerCase().includes("woman")
  );
  if (female) return female;
  // Fall back to first available
  return voices[0] ?? null;
}

export function useTTS() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [voicesLoaded, setVoicesLoaded] = useState(false);
  const pendingResolve = useRef<(() => void) | null>(null);
  const activeUtterance = useRef<SpeechSynthesisUtterance | null>(null);

  // Wait for voices to load (Chrome loads them async)
  useEffect(() => {
    const synth = window.speechSynthesis;
    if (!synth) return;

    const handleVoices = () => {
      if (synth.getVoices().length > 0) {
        setVoicesLoaded(true);
      }
    };

    handleVoices(); // check immediately
    synth.addEventListener("voiceschanged", handleVoices);
    return () => synth.removeEventListener("voiceschanged", handleVoices);
  }, []);

  const speak = useCallback(
    (text: string): Promise<void> => {
      return new Promise<void>((resolve) => {
        const synth = window.speechSynthesis;
        if (!synth || isMuted || !text.trim()) {
          resolve();
          return;
        }

        // Cancel any in-flight speech
        synth.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        const voice = pickVoice();
        if (voice) utterance.voice = voice;
        utterance.rate = 0.9;
        utterance.pitch = 1.1;

        activeUtterance.current = utterance;
        pendingResolve.current = resolve;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => {
          setIsSpeaking(false);
          activeUtterance.current = null;
          pendingResolve.current = null;
          resolve();
        };
        utterance.onerror = () => {
          setIsSpeaking(false);
          activeUtterance.current = null;
          pendingResolve.current = null;
          resolve(); // resolve on error so callers aren't stuck
        };

        synth.speak(utterance);
      });
    },
    [isMuted]
  );

  const stop = useCallback(() => {
    const synth = window.speechSynthesis;
    if (synth) synth.cancel();
    setIsSpeaking(false);
    activeUtterance.current = null;
    if (pendingResolve.current) {
      pendingResolve.current();
      pendingResolve.current = null;
    }
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      if (next) {
        // Muting: stop current speech
        const synth = window.speechSynthesis;
        if (synth) synth.cancel();
        setIsSpeaking(false);
        activeUtterance.current = null;
        if (pendingResolve.current) {
          pendingResolve.current();
          pendingResolve.current = null;
        }
      }
      return next;
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const synth = window.speechSynthesis;
      if (synth) synth.cancel();
    };
  }, []);

  return {
    speak,
    stop,
    isSpeaking,
    isMuted,
    toggleMute,
    isSupported: typeof window !== "undefined" && "speechSynthesis" in window,
    voicesLoaded,
  };
}