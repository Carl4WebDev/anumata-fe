/**
 * Observable cues commonly associated with each emotion, shown next to the
 * model results so a therapist knows what to look for in the evidence.
 *
 * These describe the emotion in general (facial cues follow FACS / Ekman
 * descriptions) — the models output an emotion label, they do not detect
 * individual features like a clenched jaw. The UI says so.
 */

export type CueKind = "face" | "voice";

type CanonicalEmotion = "angry" | "disgust" | "fear" | "happy" | "sad" | "surprise" | "neutral";

const FACE_CUES: Record<CanonicalEmotion, string[]> = {
  angry: ["scowl", "glare", "sneer", "furrowed brow", "clenched jaw", "flared nostrils", "curled lip"],
  disgust: ["wrinkled nose", "raised upper lip", "sneer", "narrowed eyes", "lowered brows", "raised chin"],
  fear: ["raised, drawn-together brows", "widened eyes", "tense lower eyelids", "lips stretched back", "open mouth"],
  happy: ["genuine smile", "raised cheeks", "crow's-feet around the eyes", "lip corners pulled up", "relaxed brow"],
  sad: ["raised inner brows", "drooping eyelids", "lip corners turned down", "downcast gaze", "trembling chin"],
  surprise: ["raised eyebrows", "wide-open eyes", "dropped jaw", "open mouth", "forehead lines"],
  neutral: ["relaxed brow", "steady gaze", "relaxed mouth and jaw", "no strong muscle tension"],
};

const VOICE_CUES: Record<CanonicalEmotion, string[]> = {
  angry: ["raised volume", "sharp or clipped tone", "faster pace", "tense, forceful voice"],
  disgust: ["low, flat tone", "drawn-out or dismissive sounds", "slower pace"],
  fear: ["higher pitch", "shaky or breathy voice", "fast, uneven pace", "hesitations"],
  happy: ["higher pitch", "lively intonation", "brighter tone", "faster pace", "laughter"],
  sad: ["lower pitch", "slow pace", "quiet volume", "flat or trailing tone", "longer pauses"],
  surprise: ["sudden rise in pitch", "short exclamations", "quick intake of breath"],
  neutral: ["even pitch", "steady pace", "moderate volume"],
};

const ALIASES: Record<string, CanonicalEmotion> = {
  angry: "angry",
  anger: "angry",
  mad: "angry",
  disgust: "disgust",
  disgusted: "disgust",
  fear: "fear",
  fearful: "fear",
  afraid: "fear",
  scared: "fear",
  anxious: "fear",
  happy: "happy",
  happiness: "happy",
  joy: "happy",
  sad: "sad",
  sadness: "sad",
  surprise: "surprise",
  surprised: "surprise",
  neutral: "neutral",
  calm: "neutral",
};

function canonical(emotion: string | null | undefined): CanonicalEmotion | null {
  if (!emotion) return null;
  return ALIASES[emotion.trim().toLowerCase()] ?? null;
}

/** Cues for an emotion label from the face (FER) or voice (SER) model; [] if unknown. */
export function emotionCues(emotion: string | null | undefined, kind: CueKind): string[] {
  const key = canonical(emotion);
  if (!key) return [];
  return (kind === "face" ? FACE_CUES : VOICE_CUES)[key];
}
