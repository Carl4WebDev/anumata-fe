import { useState, useEffect, useRef, useCallback } from "react";
import { NORMAL_VOICE_RATE } from "./comfortSettings";

const PREFERRED_VOICES = [
  "Microsoft Zira",
  "Google UK English Female",
  "Google US English Female",
  "Samantha",
  "Karen",
  "Victoria",
];

// Devices label Filipino voices either way ("fil-PH", "tl-PH", Android: "tl_PH").
const LANGUAGE_ALIASES: Record<string, string[]> = { fil: ["fil", "tl"], tl: ["tl", "fil"] };

const normalizeLang = (lang: string) => lang.toLowerCase().replace("_", "-");

/** A voice for this locale: exact match first, then the same language (with aliases). */
function findVoiceForLocale(voices: SpeechSynthesisVoice[], locale: string): SpeechSynthesisVoice | null {
  const wanted = normalizeLang(locale);
  const base = wanted.split("-")[0];
  const bases = LANGUAGE_ALIASES[base] ?? [base];
  return (
    voices.find((v) => normalizeLang(v.lang) === wanted) ??
    voices.find((v) => bases.includes(normalizeLang(v.lang).split("-")[0])) ??
    null
  );
}

function pickVoice(locale?: string): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  // Prefer a voice matching the requested locale (e.g. fil-PH for Tagalog).
  if (locale) {
    const match = findVoiceForLocale(voices, locale);
    if (match) return match;
  }
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

/** `rate`: speaking speed (slower for patients who asked for it). */
export function useTTS({ rate = NORMAL_VOICE_RATE }: { rate?: number } = {}) {
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
    (text: string, locale?: string): Promise<void> => {
      return new Promise<void>((resolve) => {
        const synth = window.speechSynthesis;
        if (!synth || isMuted || !text.trim()) {
          resolve();
          return;
        }

        // Cancel any in-flight speech
        synth.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        const voice = pickVoice(locale);
        if (voice) utterance.voice = voice;
        if (locale) utterance.lang = locale;
        utterance.rate = rate;
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
    [isMuted, rate]
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

  /**
   * Can this device speak `locale` properly? Many have no Filipino voice, and an
   * English voice reading Tagalog sounds wrong. True while voices are still
   * loading (can't tell yet — don't switch to English too early).
   */
  const hasVoiceFor = useCallback(
    (locale: string): boolean => {
      const voices = window.speechSynthesis?.getVoices() ?? [];
      return voices.length === 0 || findVoiceForLocale(voices, locale) !== null;
    },
    // Re-evaluated once the voice list has loaded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [voicesLoaded],
  );

  return {
    speak,
    stop,
    isSpeaking,
    isMuted,
    toggleMute,
    isSupported: typeof window !== "undefined" && "speechSynthesis" in window,
    voicesLoaded,
    hasVoiceFor,
  };
}