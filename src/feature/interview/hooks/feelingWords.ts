import type { LocalizedLine } from "./rapportUtils";

/**
 * "Hard to put into words? Tap how you feel" — feeling words the patient can
 * tap during a question, to help them start talking. Saved per question as
 * their own report, shown to the therapist next to what the AI read.
 * The keys match the backend's list (feelingsTapped.js).
 */

export const FEELING_WORDS: { key: string; face: string; label: LocalizedLine }[] = [
  { key: "sad", face: "😢", label: { en: "Sad", tl: "Malungkot", ceb: "Masulub-on" } },
  { key: "worried", face: "😟", label: { en: "Worried", tl: "Nag-aalala", ceb: "Nabalaka" } },
  { key: "scared", face: "😨", label: { en: "Scared", tl: "Natatakot", ceb: "Nahadlok" } },
  { key: "angry", face: "😠", label: { en: "Angry", tl: "Galit", ceb: "Nasuko" } },
  { key: "tired", face: "😩", label: { en: "Tired", tl: "Pagod", ceb: "Gikapoy" } },
  { key: "lonely", face: "🥺", label: { en: "Lonely", tl: "Nag-iisa", ceb: "Mingaw" } },
  { key: "okay", face: "🙂", label: { en: "Okay", tl: "Ayos lang", ceb: "Okay ra" } },
  { key: "hopeful", face: "🌱", label: { en: "Hopeful", tl: "May pag-asa", ceb: "Naay paglaom" } },
];

export const MAX_FEELINGS_PER_QUESTION = 3;

export const FEELINGS_PROMPT: LocalizedLine = {
  en: "Hard to put into words? Tap how you feel",
  tl: "Mahirap bang sabihin? Pumili kung ano ang nararamdaman mo",
  ceb: "Lisod ba isulti? Pagpili kung unsa imong gibati",
};

export const FEELINGS_THANKS: LocalizedLine = {
  en: "Thank you. If you can, tell me a little about it.",
  tl: "Salamat. Kung kaya mo, ikuwento mo nang kaunti.",
  ceb: "Salamat. Kung kaya nimo, isugilon gamay bahin niini.",
};

/** Tap toggles a word; at most three per question (a fourth tap is ignored). */
export function toggleFeeling(current: string[], key: string): string[] {
  if (current.includes(key)) return current.filter((k) => k !== key);
  return current.length >= MAX_FEELINGS_PER_QUESTION ? current : [...current, key];
}

/** The English label of a feeling word, for the therapist's screens. */
export function feelingLabel(key: string): { face: string; label: string } | null {
  const word = FEELING_WORDS.find((w) => w.key === key);
  return word ? { face: word.face, label: word.label.en } : null;
}
