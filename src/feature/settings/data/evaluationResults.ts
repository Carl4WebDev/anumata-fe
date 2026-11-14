/**
 * Test-set evaluation of the three emotion models (SER/LER run 2026-07-17; FER
 * retrained and evaluated 2026-11-13), copied from the training projects'
 * classification reports. Same numbers as anumata-be/docs/evaluation/ — update
 * both together if a model is retrained.
 */

export const EMOTION_LABELS = ["Angry", "Happy", "Neutral", "Sad"] as const;

export interface ClassMetrics {
  label: (typeof EMOTION_LABELS)[number];
  precision: number;
  recall: number;
  f1: number;
  support: number;
}

export interface ModelEvaluation {
  key: "ser" | "ler" | "fer";
  name: string;
  input: string;
  backbone: string;
  /** Part of the session result the therapist sees? */
  inFusion: boolean;
  datasets: string;
  split: string;
  accuracy: number;
  macroF1: number;
  weightedF1: number;
  testSamples: number;
  perClass: ClassMetrics[];
  /** Rows = true emotion, columns = predicted, in EMOTION_LABELS order. */
  confusion: number[][];
  training: string;
  notes: string[];
}

export const MODEL_EVALUATIONS: ModelEvaluation[] = [
  {
    key: "ser",
    name: "Voice tone (SER)",
    input: "Recorded voice, 16 kHz",
    backbone: "Wav2Vec2-base",
    inFusion: true,
    datasets: "Acted English speech: CREMA-D 4,900 · TESS 1,600 · RAVDESS 672 · SAVEE 300 clips (121 speakers)",
    split: "Train 5,230 · validation 1,121 · test 1,121 clips (stratified 70/15/15)",
    accuracy: 0.9054,
    macroF1: 0.9052,
    weightedF1: 0.9056,
    testSamples: 1121,
    perClass: [
      { label: "Angry", precision: 0.9239, recall: 0.9239, f1: 0.9239, support: 289 },
      { label: "Happy", precision: 0.9075, recall: 0.8854, f1: 0.8963, support: 288 },
      { label: "Neutral", precision: 0.8536, recall: 0.9336, f1: 0.8918, support: 256 },
      { label: "Sad", precision: 0.9373, recall: 0.8819, f1: 0.9088, support: 288 },
    ],
    confusion: [
      [267, 11, 5, 6],
      [18, 255, 11, 4],
      [3, 7, 239, 7],
      [1, 8, 25, 254],
    ],
    training: "Phase 1 frozen backbone (LR 1e-3), phase 2 fine-tuning (LR 1e-5); batch 16; dropout 0.3; early stopping 5.",
    notes: [
      "Strongest model — half of the fused result.",
      "The split is by file, not by speaker: all 121 speakers are in both training and test, so every test clip is a voice the model trained on — 90.5% is likely optimistic for a new voice.",
      "Trained on acted English speech; real Filipino patients may score lower.",
    ],
  },
  {
    key: "ler",
    name: "Words (LER)",
    input: "Transcript of the answer",
    backbone: "XLM-RoBERTa-base",
    inFusion: false,
    datasets: "English online text: GoEmotions 50,634 · DAIR-AI Emotion 19,234 texts",
    split: "Train 55,894 · validation 6,987 · test 6,987 texts (duplicates removed; only 7 test texts also in training)",
    accuracy: 0.7497,
    macroF1: 0.7305,
    weightedF1: 0.7554,
    testSamples: 6987,
    perClass: [
      { label: "Angry", precision: 0.5925, recall: 0.695, f1: 0.6397, support: 1023 },
      { label: "Happy", precision: 0.9031, recall: 0.7702, f1: 0.8314, support: 3146 },
      { label: "Neutral", precision: 0.597, recall: 0.6828, f1: 0.637, support: 1614 },
      { label: "Sad", precision: 0.7965, recall: 0.8322, f1: 0.814, support: 1204 },
    ],
    confusion: [
      [711, 57, 191, 64],
      [133, 2423, 479, 111],
      [268, 163, 1102, 81],
      [88, 40, 74, 1002],
    ],
    training: "Phase 1 frozen backbone (LR 1e-3), phase 2 top 4 layers (LR 1e-5 / head 1e-4); batch 16; class-balanced sampling.",
    notes: [
      "Experimental — shown to the therapist but not part of the fused result.",
      "Test data is English; patients may speak Tagalog or Bisaya.",
    ],
  },
  {
    key: "fer",
    name: "Facial expression (FER)",
    input: "Grayscale face, 224×224",
    backbone: "EfficientNet-B0",
    inFusion: true,
    datasets:
      "Cleaned face photos: FER2013 24,573 · RAF-DB 12,295 · CK+ 142 · Davao (Filipino) 151 — duplicates, blank images, conflicting labels and test-image copies removed",
    split:
      "Train 25,234 · validation 4,287 · test 7,640 images — the test set is FER2013's and RAF-DB's official test images (duplicates removed) plus 23 Davao photos",
    accuracy: 0.7715,
    macroF1: 0.7463,
    weightedF1: 0.7742,
    testSamples: 7640,
    perClass: [
      { label: "Angry", precision: 0.6792, recall: 0.7078, f1: 0.6932, support: 1095 },
      { label: "Happy", precision: 0.9343, recall: 0.8633, f1: 0.8974, support: 2949 },
      { label: "Neutral", precision: 0.6719, recall: 0.7495, f1: 0.7086, support: 1888 },
      { label: "Sad", precision: 0.6942, recall: 0.678, f1: 0.686, support: 1708 },
    ],
    confusion: [
      [775, 41, 133, 146],
      [93, 2546, 230, 80],
      [110, 79, 1415, 284],
      [163, 59, 328, 1158],
    ],
    training:
      "3 stages from ImageNet: head 10 epochs (LR 1e-3); last block 15 epochs (LR 1e-5); last 3 blocks 20 epochs (LR 1e-4, early stop 5); batch 16; dropout 0.4; best at stage 3, epoch 6 (validation 75.79%).",
    notes: [
      "Retrained on a cleaned dataset with Filipino (Davao) faces: 77.15%, up from the previous model's 61.15% (that model scores 54.27% on this cleaned test set).",
      "Davao test photos: 65.22% (23 photos). Sad is the weak spot there — 0 of 4 Davao sad photos were read as sad; more Davao angry and sad photos would help most.",
      "Most remaining mistakes are sad faces read as neutral (328) and neutral faces read as sad (284).",
      "Faces are made grayscale before classifying, the same as in training.",
    ],
  },
];

/** Short explanations shown with the numbers. */
export const READING_TIPS: { term: string; meaning: string }[] = [
  { term: "Accuracy", meaning: "Share of test samples the model labelled correctly." },
  { term: "Precision", meaning: "When the model says this emotion, how often it's right." },
  { term: "Recall", meaning: "Of all samples that really were this emotion, how many the model found." },
  { term: "F1", meaning: "Balance of precision and recall (1.0 = perfect)." },
  { term: "Macro F1", meaning: "Average F1 over the 4 emotions, each counted equally." },
  {
    term: "Confidence (in a session)",
    meaning: "The model's probability for one answer — not its accuracy. 80% confidence ≠ 80% accurate.",
  },
];
