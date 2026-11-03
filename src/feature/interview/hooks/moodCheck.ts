import type { LocalizedLine } from "./rapportUtils";

/**
 * "How are you feeling right now?" — five faces, tapped right before the first
 * question and after the last. 1 = very bad … 5 = very good. The therapist
 * sees whether the interview stirred something up, and it is the patient's own
 * report to compare with what the AI read from their face and voice.
 */

export type MoodMoment = "before" | "after";

/** The patient's two ratings; null when skipped or not asked. */
export interface SelfReport {
  mood_before: number | null;
  mood_after: number | null;
}

export const MOOD_SCALE: { value: number; face: string; label: LocalizedLine }[] = [
  { value: 1, face: "😢", label: { en: "Very bad", tl: "Napakasama", ceb: "Grabe ka bati" } },
  { value: 2, face: "🙁", label: { en: "Not good", tl: "Hindi maganda", ceb: "Dili maayo" } },
  { value: 3, face: "😐", label: { en: "Okay", tl: "Ayos lang", ceb: "Okay ra" } },
  { value: 4, face: "🙂", label: { en: "Good", tl: "Mabuti", ceb: "Maayo" } },
  { value: 5, face: "😄", label: { en: "Very good", tl: "Napakabuti", ceb: "Maayo kaayo" } },
];

export const MOOD_QUESTIONS: Record<MoodMoment, LocalizedLine> = {
  before: {
    en: "Before we begin — how are you feeling right now? Tap a face.",
    tl: "Bago tayo magsimula — ano ang pakiramdam mo ngayon? Pumili ng mukha.",
    ceb: "Sa dili pa ta magsugod — unsa imong gibati karon? Pagpili og nawong.",
  },
  after: {
    en: "And now that we're done — how are you feeling? Tap a face.",
    tl: "At ngayong tapos na tayo — ano ang pakiramdam mo? Pumili ng mukha.",
    ceb: "Ug karon nga nahuman na ta — unsa imong gibati? Pagpili og nawong.",
  },
};

export const MOOD_SKIP: LocalizedLine = { en: "Skip", tl: "Laktawan", ceb: "Laktawan" };

export function moodLabel(value: number | null | undefined, lang: keyof LocalizedLine = "en"): string | null {
  return MOOD_SCALE.find((m) => m.value === value)?.label[lang] ?? null;
}
