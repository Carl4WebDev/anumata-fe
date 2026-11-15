/**
 * "How Amumata reads emotions" — a plain-language walk-through of the AI, with
 * examples, for the admin page. The numbers come from the AI service's code:
 *   src/ai/config.py (weights, guards), src/ai/ai_service.py (frame choice,
 *   session mix), src/ai/fusion/fusion_engine.py (fusion, risk, spikes),
 *   src/ai/ser/ser_service.py (the 3 s voice window).
 * `fuse()` below repeats the fusion formula so the worked examples are computed,
 * not typed by hand.
 */

export type Emotion = "Angry" | "Happy" | "Neutral" | "Sad";
export const EMOTIONS: Emotion[] = ["Angry", "Happy", "Neutral", "Sad"];
export type Probabilities = Record<Emotion, number>;

export interface ModelReading {
  model: "Face (FER)" | "Voice (SER)";
  emotion: Emotion;
  probabilities: Probabilities;
}

// Same as src/ai/config.py → FusionConfig. Words (LER) has weight 0: shown, not counted.
export const FUSION_WEIGHTS = { face: 0.5, voice: 0.5, words: 0 };

export interface FusionResult {
  combined: Probabilities;
  winner: Emotion;
  /** Before lowering it for disagreement. */
  rawConfidence: number;
  confidence: number;
  agreeing: number;
}

const top = (p: Probabilities): number => Math.max(...EMOTIONS.map((e) => p[e]));

/**
 * Confidence-adaptive weighted fusion, as in fusion_engine.py:
 * each model counts 50% × its own confidence; if the models disagree, the
 * winner's confidence is multiplied by 0.5 + 0.5 × (share of models that agree);
 * under 20% → Neutral.
 */
export function fuse(face: ModelReading, voice: ModelReading): FusionResult {
  const readings = [
    { r: face, w: FUSION_WEIGHTS.face * top(face.probabilities) },
    { r: voice, w: FUSION_WEIGHTS.voice * top(voice.probabilities) },
  ];
  const total = readings.reduce((sum, x) => sum + x.w, 0);
  const combined = Object.fromEntries(
    EMOTIONS.map((e) => [e, readings.reduce((sum, x) => sum + x.r.probabilities[e] * x.w, 0) / total]),
  ) as Probabilities;
  let winner = EMOTIONS.reduce((best, e) => (combined[e] > combined[best] ? e : best), EMOTIONS[0]);
  let rawConfidence = combined[winner];
  if (rawConfidence < 0.2) {
    winner = "Neutral";
    rawConfidence = combined.Neutral;
  }
  const agreeing = readings.filter((x) => x.r.emotion === winner).length;
  const disagree = face.emotion !== voice.emotion;
  const confidence = disagree ? rawConfidence * (0.5 + 0.5 * (agreeing / readings.length)) : rawConfidence;
  return { combined, winner, rawConfidence, confidence, agreeing };
}

export interface HowStep {
  title: string;
  /** Which model, if any. */
  model?: string;
  plain: string[];
  example: string;
}

export const HOW_STEPS: HowStep[] = [
  {
    title: "1. What is recorded",
    plain: [
      "For every answer, the room keeps a photo of the patient's face every 3 seconds and one voice recording.",
      "Nothing is judged during the interview. The AI analyses everything after the patient finishes, on the AI server.",
      "Questions the patient skipped are left out of the results, so a silent non-answer doesn't count as “Neutral”.",
    ],
    example: "A 45-second answer gives about 15 face photos and 1 voice recording.",
  },
  {
    title: "2. The face",
    model: "FER — EfficientNet-B0, 4 emotions",
    plain: [
      "In each photo, the model finds the face, crops it, turns it grayscale and gives four scores that add up to 100%: Angry, Happy, Neutral, Sad.",
      "One photo stands for the whole answer: the most confident one, with Sad and Angry counted double, so a brief sad expression isn't drowned out by many neutral photos.",
      "Guard: if the top score is under 40% and leads the second by less than 15 points, it's too unsure, so it reads as Neutral.",
      "No face found (looking away, camera off) → the face is left out and the voice decides alone.",
    ],
    example:
      "Three photos: Neutral 70%, Neutral 65%, Sad 48%. Scores for choosing: 0.70, 0.65 and 0.48 × 2 = 0.96 → the Sad photo is used for this answer.",
  },
  {
    title: "3. The voice",
    model: "SER — Wav2Vec2, 4 emotions",
    plain: [
      "The model listens to the tone — pitch, energy, rhythm — not the words, so it works the same for English, Tagalog and Bisaya.",
      "It hears 3 seconds of the patient's speech, starting half a second after they begin talking (the silence before is skipped).",
      "Guard: if the top score is under 50% and leads the second by less than 20 points, it reads as Neutral (voice is less certain than the face, so the rule is stricter).",
      "Silence, or less than 1 second of sound → Neutral.",
    ],
    example: "A low, slow, shaky voice: Sad 70%, Neutral 15%, Angry 10%, Happy 5% → Sad.",
  },
  {
    title: "4. The words",
    model: "Faster-Whisper (speech to text) + XLM-RoBERTa (LER)",
    plain: [
      "Whisper writes down what the patient said, in English, Tagalog or Bisaya — this is the transcript the therapist reads.",
      "A third model reads the transcript and gives its own emotion. It is shown on each question for the therapist, but it is experimental, so it is not counted in the result (weight 0).",
    ],
    example: "“Pagod na ko, wala nay gana” → words model: Sad. Shown on the question card; the combined result still comes from face and voice.",
  },
  {
    title: "5. Combining face and voice (fusion)",
    model: "Confidence-adaptive weighted fusion",
    plain: [
      "Face and voice each count 50% — times how confident each one is. A model that is sure counts more than one that is unsure.",
      "Their four scores are blended with those weights; the highest blended score is the answer's emotion.",
      "If face and voice disagree, the result's confidence is lowered (by up to half), so a split decision never looks certain.",
      "If even the highest blended score is under 20%, the answer reads as Neutral. If only one model could be used, its result is used as it is.",
    ],
    example: "See the two worked examples below: one where face and voice agree, one where they don't.",
  },
  {
    title: "6. The whole session",
    plain: [
      "Each answer gets one emotion. The session mix is the share of answers with each emotion (e.g. 3 of 5 answers Sad = 60% Sad).",
      "Risk level, from Sad + Angry: above 60% → High, above 30% → Moderate, otherwise Low.",
      "Indicators: Sad above 50% → “Predominantly sad affect”; Angry above 30% → “Elevated anger”; Sad above 30% with Angry above 20% → “Mixed negative emotions”; Neutral above 70% or Happy above 50% are noted too.",
      "Spikes mark answers worth a closer look: a turn from Neutral/Happy to Sad/Angry, Sad or Angry at 70% or more, Sad ↔ Angry flips, a negative emotion getting stronger, or one model strongly negative (80%+) when the combined result isn't.",
    ],
    example: "See the session example below.",
  },
  {
    title: "7. The written summary",
    model: "Llama 3.2 (3B) via Ollama",
    plain: [
      "A language model writes a short summary from the transcript and the results above. It doesn't decide emotions; it describes what the models found.",
      "Everything is a pre-evaluation for the therapist to review — never a diagnosis.",
    ],
    example: "“The patient spoke mostly about fatigue and loss of interest; sadness was the most frequent emotion, strongest on Q3.”",
  },
];

const reading = (model: ModelReading["model"], emotion: Emotion, p: [number, number, number, number]): ModelReading => ({
  model,
  emotion,
  probabilities: { Angry: p[0], Happy: p[1], Neutral: p[2], Sad: p[3] },
});

export interface FusionExample {
  title: string;
  story: string;
  face: ModelReading;
  voice: ModelReading;
  takeaway: string;
}

export const FUSION_EXAMPLES: FusionExample[] = [
  {
    title: "Face and voice agree",
    story: "The patient answers “Okay ra man ko…” with a downcast face and a low voice.",
    face: reading("Face (FER)", "Sad", [0.08, 0.05, 0.25, 0.62]),
    voice: reading("Voice (SER)", "Sad", [0.1, 0.05, 0.15, 0.7]),
    takeaway: "Both say Sad, so nothing is lowered: the answer reads Sad, even though the words alone sound fine.",
  },
  {
    title: "Face and voice disagree",
    story: "The patient keeps a calm face, but their voice is heavy and sad.",
    face: reading("Face (FER)", "Neutral", [0.05, 0.1, 0.55, 0.3]),
    voice: reading("Voice (SER)", "Sad", [0.05, 0.05, 0.1, 0.8]),
    takeaway:
      "The voice is surer (80% vs 55%), so it counts more and Sad wins — but because the face disagrees, the confidence is lowered, telling the therapist to look at this answer themselves.",
  },
];

export interface SessionExampleAnswer {
  question: string;
  emotion: Emotion;
  confidence: number;
  spike?: string;
}

export const SESSION_EXAMPLE: SessionExampleAnswer[] = [
  { question: "Q1", emotion: "Neutral", confidence: 0.6 },
  { question: "Q2", emotion: "Sad", confidence: 0.66, spike: "Emotional shift: Neutral → Sad" },
  { question: "Q3", emotion: "Sad", confidence: 0.78, spike: "High-confidence sad; intensifying sad (+12%)" },
  { question: "Q4", emotion: "Angry", confidence: 0.58, spike: "Emotion flip: Sad → Angry" },
  { question: "Q5", emotion: "Sad", confidence: 0.55, spike: "Emotion flip: Angry → Sad" },
];

/** Share of answers per emotion, in %, as in ai_service._compute_distribution. */
export function sessionMix(answers: { emotion: Emotion }[]): Probabilities {
  const total = answers.length || 1;
  return Object.fromEntries(
    EMOTIONS.map((e) => [e, Math.round((answers.filter((a) => a.emotion === e).length / total) * 1000) / 10]),
  ) as Probabilities;
}

/** Sad + Angry: above 60 → High, above 30 → Moderate, else Low (fusion_engine.compute_risk_level). */
export function riskLevel(mix: Probabilities): "High" | "Moderate" | "Low" {
  const negative = mix.Sad + mix.Angry;
  if (negative > 60) return "High";
  if (negative > 30) return "Moderate";
  return "Low";
}

/** Things to keep in mind when reading the results. */
export const READ_WITH_CARE: string[] = [
  "A score is the model's confidence for one answer, not its accuracy: “Sad 80%” doesn't mean 80% sure to be right.",
  "Test-set accuracy: voice 90.54%, words 74.97%, face 77.15% (65.22% on the Davao photos). The face model most often confuses Sad with Neutral — that's why the voice counts as much.",
  "The voice model hears 3 seconds of each answer, and the face model one photo per answer — enough to flag moments, not to describe the whole answer.",
  "Amumata gives a pre-evaluation to help the therapist prepare. The therapist decides what it means.",
];
