import { useCallback, useState } from "react";

/**
 * Patient comfort options: larger text and a slower voice (e.g. for older
 * patients). Remembered in this browser only; if storage is blocked (private
 * mode) the choice simply lasts for this visit.
 */

export const NORMAL_VOICE_RATE = 0.9;
export const SLOW_VOICE_RATE = 0.7;

const STORAGE_KEY = "amumata_comfort";

interface ComfortChoice {
  largeText: boolean;
  slowVoice: boolean;
}

const DEFAULTS: ComfortChoice = { largeText: false, slowVoice: false };

function load(): ComfortChoice {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    return { largeText: saved?.largeText === true, slowVoice: saved?.slowVoice === true };
  } catch {
    return DEFAULTS;
  }
}

function save(choice: ComfortChoice) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(choice));
  } catch {
    /* storage blocked — keep it for this visit only */
  }
}

export function useComfortSettings() {
  const [choice, setChoice] = useState<ComfortChoice>(load);

  const toggle = useCallback((key: keyof ComfortChoice) => {
    setChoice((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      save(next);
      return next;
    });
  }, []);

  return {
    ...choice,
    voiceRate: choice.slowVoice ? SLOW_VOICE_RATE : NORMAL_VOICE_RATE,
    toggleLargeText: useCallback(() => toggle("largeText"), [toggle]),
    toggleSlowVoice: useCallback(() => toggle("slowVoice"), [toggle]),
  };
}
