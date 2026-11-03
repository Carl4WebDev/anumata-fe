export type VerificationStatus =
  | "verified"
  | "partially-verified"
  | "missing-evidence"
  | "not-implemented";

export interface GuideItem {
  id: string;
  title: string;
  content: string;
  verification: VerificationStatus;
  source?: string;
  codeRef?: string;
  tags?: string[];
}

export interface GuideSection {
  id: string;
  title: string;
  icon: string;
  items: GuideItem[];
}

// ---------------------------------------------------------------------------
// Amumata AI Model & Project Guide — 13 sections, thesis defense preparation
// Every claim tagged with verification status. Sources from code audit.
// ---------------------------------------------------------------------------

export const guideSections: GuideSection[] = [
  // =======================================================================
  // 1. OVERVIEW
  // =======================================================================
  {
    id: "overview",
    title: "Overview",
    icon: "BookOpen",
    items: [
      {
        id: "system-purpose",
        title: "System Purpose",
        content:
          "AI-assisted emotional-state pre-evaluation for clinical interviews. **NOT diagnosis.** " +
          "Provides quantitative emotional data from facial and vocal cues for licensed therapists to use " +
          "alongside clinical judgment.",
        verification: "verified",
        source: "src/ai/fusion/fusion_engine.py",
        tags: ["overview", "purpose", "system"],
      },
      {
        id: "pipeline-summary",
        title: "Pipeline Summary",
        content:
          "Browser captures frames + audio → Backend sends to Python AI → FER + SER + LER + STT + fusion → results stored → therapist reviews.\n\n" +
          "Per question: FER (best frame) → SER (audio) → STT (transcription) → LER (text, weight=0) → " +
          "Fusion (confidence-adaptive weighted) → Store in DB.",
        verification: "verified",
        source: "src/ai/fusion/fusion_engine.py",
        codeRef: "fusion_engine.py",
        tags: ["pipeline", "overview", "architecture"],
      },
      {
        id: "ai-components",
        title: "6 AI Components",
        content:
          "1. **FER** — EfficientNet-B0 (`src/ai/fer/fer_service.py`)\n" +
          "2. **SER** — Wav2Vec2-base (`src/ai/ser/ser_service.py`)\n" +
          "3. **LER** — XLM-RoBERTa-base (`src/ai/ler/ler_service.py`)\n" +
          "4. **STT** — Whisper large-v3 (`src/ai/stt/stt_service.py`)\n" +
          "5. **Fusion Engine** — confidence-adaptive weighted fusion (`src/ai/fusion/fusion_engine.py`)\n" +
          "6. **Report Generator** — Llama 3.2:3B via Ollama (`src/ai/report/report_generator.py`)\n\n" +
          "Status: All components operational (verified from health endpoint).",
        verification: "verified",
        source: "src/ai/config.py",
        tags: ["components", "architecture", "models"],
      },
      {
        id: "four-emotion-labels",
        title: "Four Emotion Labels",
        content:
          "The system uses 4 emotion classes across all modalities:\n" +
          "- **Index 0: Angry**\n" +
          "- **Index 1: Happy**\n" +
          "- **Index 2: Neutral**\n" +
          "- **Index 3: Sad**\n\n" +
          "All models output softmax probabilities over these 4 classes. Index order is consistent across FER, SER, and LER.",
        verification: "verified",
        source: "src/ai/config.py",
        codeRef: "config.py:33-35",
        tags: ["emotions", "labels", "classes"],
      },
    ],
  },

  // =======================================================================
  // 2. FER — FACIAL EXPRESSION RECOGNITION
  // =======================================================================
  {
    id: "fer",
    title: "FER — Facial Expression Recognition",
    icon: "Eye",
    items: [
      {
        id: "fer-architecture",
        title: "FER Architecture",
        content:
          "**Backbone:** EfficientNet-B0 pretrained on ImageNet.\n\n" +
          "**Custom classifier head:**\n" +
          "BatchNorm1d(768) → Dropout(0.4) → Linear(768,256) → ReLU → Dropout(0.4) → Linear(256,4)\n\n" +
          "**Checkpoint:** `src/ai/models/fer_best_model.pth`, PyTorch state_dict. " +
          "Logs `checkpoint[\"epoch\"]` and `checkpoint[\"best_val_acc\"]` on load.",
        verification: "verified",
        source: "src/ai/fer/fer_service.py",
        codeRef: "fer_service.py:34-54",
        tags: ["fer", "architecture", "efficientnet", "model"],
      },
      {
        id: "fer-face-detection",
        title: "FER Face Detection",
        content:
          "OpenCV Haar Cascade (`haarcascade_frontalface_default.xml`), **NOT MTCNN**.\n\n" +
          "Parameters: scaleFactor=1.1, minNeighbors=3, minSize=(40,40). " +
          "Selects largest face by area (width x height).",
        verification: "verified",
        source: "src/ai/fer/fer_service.py",
        codeRef: "fer_service.py:99-108",
        tags: ["fer", "haar-cascade", "face-detection", "opencv"],
      },
      {
        id: "fer-input-preprocessing",
        title: "FER Input Preprocessing",
        content:
          "1. Grayscale + histogram equalization for face detection\n" +
          "2. Select largest face, crop region\n" +
          "3. Convert crop to RGB\n" +
          "4. Resize to 224x224\n" +
          "5. ImageNet normalization: mean=[0.485,0.456,0.406], std=[0.229,0.224,0.225]\n\n" +
          "Transform: Resize(224,224) → ToTensor → Normalize.",
        verification: "verified",
        source: "src/ai/config.py",
        codeRef: "config.py:67-89, fer_service.py:95-112",
        tags: ["fer", "preprocessing", "input", "normalization"],
      },
      {
        id: "fer-output",
        title: "FER Output",
        content:
          "Softmax probabilities across 4 classes. Index order: [0=Angry, 1=Happy, 2=Neutral, 3=Sad]. " +
          "Probabilities sum to ~1.0. Highest probability = predicted emotion.",
        verification: "verified",
        source: "src/ai/fer/fer_service.py",
        codeRef: "config.py:33-35, fer_service.py:119",
        tags: ["fer", "output", "softmax", "probabilities"],
      },
      {
        id: "fer-confidence-guard",
        title: "FER Confidence Guard",
        content:
          "If `top_prob < 0.40` AND `margin (top - second) < 0.15` → override to Neutral " +
          "using Neutral's softmax probability. Prevents low-confidence noisy predictions from " +
          "influencing fusion.",
        verification: "verified",
        source: "src/ai/fer/fer_service.py",
        codeRef: "fer_service.py:122-134",
        tags: ["fer", "confidence", "guard", "threshold"],
      },
      {
        id: "fer-frame-selection",
        title: "FER Frame Selection (Multi-Frame)",
        content:
          "All frames processed independently. Best frame selected by spike-emotion-weighted score: " +
          "Sad and Angry get 2x multiplier on confidence. " +
          "Ensures emotionally significant negative frames are not diluted by neutral frames.",
        verification: "verified",
        source: "src/ai/ai_service.py",
        codeRef: "ai_service.py:101-113",
        tags: ["fer", "frame-selection", "spike", "priority"],
      },
      {
        id: "fer-known-limitations",
        title: "FER Known Limitations",
        content:
          "- OpenCV Haar Cascade less robust than MTCNN for angled/partial faces\n" +
          "- No evaluation metrics available in repo\n" +
          "- Training pipeline undocumented (see Training Data section)\n" +
          "- Static frames: captures every ~3 seconds, may miss micro-expressions",
        verification: "verified",
        source: "src/ai/fer/fer_service.py",
        tags: ["fer", "limitations", "haar-cascade"],
      },
    ],
  },

  // =======================================================================
  // 3. SER — SPEECH EMOTION RECOGNITION
  // =======================================================================
  {
    id: "ser",
    title: "SER — Speech Emotion Recognition",
    icon: "Mic",
    items: [
      {
        id: "ser-architecture",
        title: "SER Architecture",
        content:
          "**Backbone:** Wav2Vec2-base (facebook/wav2vec2-base), pretrained on 960 hours of LibriSpeech.\n\n" +
          "**Custom classifier head:**\n" +
          "Linear(768,256) → ReLU → Dropout(0.3) → Linear(256,4)\n\n" +
          "**Pooling:** Mean pooling over time dimension of last hidden state.\n\n" +
          "**Checkpoint:** `src/ai/models/ser_best_model.pt`, PyTorch state_dict.\n\n" +
          "**NOTE:** Thesis document may reference CNN-LSTM. The actual production code uses Wav2Vec2. " +
          "This is an architecture discrepancy.",
        verification: "verified",
        source: "src/ai/ser/ser_service.py",
        codeRef: "ser_service.py:38-59",
        tags: ["ser", "architecture", "wav2vec2", "model"],
      },
      {
        id: "ser-input-preprocessing",
        title: "SER Input Preprocessing",
        content:
          "1. Receive audio (webm/any format from browser)\n" +
          "2. pydub conversion to WAV\n" +
          "3. 16kHz mono audio, max 3.0s duration, 0.5s offset from start\n\n" +
          "Loaded via `librosa.load(sr=16000, duration=3.0, offset=0.5, mono=True)`.\n" +
          "Processor: `AutoProcessor.from_pretrained(\"facebook/wav2vec2-base\")`.",
        verification: "verified",
        source: "src/ai/ser/ser_service.py",
        codeRef: "config.py:102-104, ser_service.py:84-106,146-147",
        tags: ["ser", "preprocessing", "audio", "wav2vec2"],
      },
      {
        id: "ser-output",
        title: "SER Output",
        content:
          "Softmax probabilities, same 4 classes as FER: [Angry, Happy, Neutral, Sad]. " +
          "Probabilities sum to ~1.0.",
        verification: "verified",
        source: "src/ai/ser/ser_service.py",
        tags: ["ser", "output", "softmax", "probabilities"],
      },
      {
        id: "ser-confidence-guard",
        title: "SER Confidence Guard",
        content:
          "If `top_prob < 0.50` AND `margin < 0.20` → override to Neutral.\n\n" +
          "SER uses stricter thresholds than FER (0.50/0.20 vs 0.40/0.15) because " +
          "audio-based emotion recognition has higher inherent uncertainty.",
        verification: "verified",
        source: "src/ai/ser/ser_service.py",
        codeRef: "ser_service.py:179-198",
        tags: ["ser", "confidence", "guard", "threshold"],
      },
      {
        id: "ser-silence-detection",
        title: "SER Silence Detection",
        content:
          "- RMS < 0.005 → return Neutral with confidence 1.0\n" +
          "- Audio < 1.0s → return Neutral\n\n" +
          "These guards prevent unreliable predictions on non-speech audio.",
        verification: "verified",
        source: "src/ai/ser/ser_service.py",
        codeRef: "config.py:108, ser_service.py:141-154",
        tags: ["ser", "silence", "edge-case", "neutral"],
      },
      {
        id: "ser-language-handling",
        title: "SER Language Handling",
        content:
          "SER processes raw waveforms regardless of language. Language detection happens " +
          "at the STT/LER level, not SER. The model analyzes acoustic features (pitch, energy, " +
          "spectral patterns) that correlate with emotional state independently of language.",
        verification: "verified",
        source: "src/ai/ser/ser_service.py",
        tags: ["ser", "language", "agnostic", "waveform"],
      },
      {
        id: "ser-known-limitations",
        title: "SER Known Limitations",
        content:
          "- No language-specific evaluation\n" +
          "- No evaluation metrics in repo\n" +
          "- Training pipeline undocumented (see Training Data section)",
        verification: "verified",
        source: "src/ai/ser/ser_service.py",
        tags: ["ser", "limitations"],
      },
    ],
  },

  // =======================================================================
  // 4. EMOTION LABELS AND NUMERIC OUTPUTS
  // =======================================================================
  {
    id: "emotion-labels",
    title: "Emotion Labels and Numeric Outputs",
    icon: "Tag",
    items: [
      {
        id: "four-labels",
        title: "4 Labels: Angry, Happy, Neutral, Sad",
        content:
          "All modalities use 4 emotion classes in this order:\n" +
          "- Index 0: Angry\n" +
          "- Index 1: Happy\n" +
          "- Index 2: Neutral\n" +
          "- Index 3: Sad",
        verification: "verified",
        source: "src/ai/config.py",
        codeRef: "config.py:33-35",
        tags: ["emotions", "labels", "classes"],
      },
      {
        id: "softmax-format",
        title: "Softmax Output Format",
        content:
          "Each model outputs softmax probabilities: 4 values between 0 and 1, summing to ~1.0.\n\n" +
          "**Illustrative example (NOT a measured result):**\n" +
          "Happy=0.62, Sad=0.15, Angry=0.08, Neutral=0.15 → Predicted label: Happy (highest score).\n\n" +
          "This example matches the actual output format.",
        verification: "verified",
        source: "src/ai/fer/fer_service.py",
        tags: ["emotions", "output", "format", "softmax"],
      },
      {
        id: "softmax-not-calibrated",
        title: "Softmax Score is NOT Calibrated Probability",
        content:
          "**Important:** Softmax score is NOT a calibrated probability of correctness. " +
          "A score of 0.80 does NOT mean 80% accuracy. It reflects the model's certainty, not ground truth.",
        verification: "verified",
        tags: ["emotions", "confidence", "calibration"],
      },
      {
        id: "confidence-thresholds",
        title: "Confidence Thresholds (Implementation Guards)",
        content:
          "Confidence thresholds exist in code:\n" +
          "- FER: top_prob < 0.40 AND margin < 0.15 → override to Neutral\n" +
          "- SER: top_prob < 0.50 AND margin < 0.20 → override to Neutral\n\n" +
          "These are implementation guards, NOT clinically validated standards.",
        verification: "verified",
        source: "src/ai/fer/fer_service.py",
        codeRef: "fer_service.py:122-134, ser_service.py:179-198",
        tags: ["emotions", "confidence", "thresholds"],
      },
      {
        id: "confidence-badge-display",
        title: "ConfidenceBadge Display Thresholds",
        content:
          "No additional confidence bands (low/moderate/high) are defined in the codebase. " +
          "The ConfidenceBadge component uses arbitrary color thresholds for display only:\n" +
          "- >= 70% green\n" +
          "- 40-69% amber\n" +
          "- < 40% red",
        verification: "verified",
        tags: ["emotions", "confidence", "display", "ui"],
      },
    ],
  },

  // =======================================================================
  // 5. TRAINING DATA AND PREPROCESSING
  // =======================================================================
  {
    id: "training-data",
    title: "Training Data and Preprocessing",
    icon: "Database",
    items: [
      {
        id: "training-projects",
        title: "Where the Production Models Were Trained",
        content:
          "The three production models were trained in separate **PyTorch** projects outside this repository " +
          "(`fer/`, `ser/`, `language/`). Their training settings, dataset notes and test-set results are copied " +
          "into `docs/evaluation/`.\n\n" +
          "The deployed checkpoints in `src/ai/models/` are the same files that were evaluated " +
          "(`fer_best_model.pth`, `ser_best_model.pt` = phase 2, `ler_best_model.pt` = phase 2).\n\n" +
          "The TensorFlow/Keras \"factory\" scripts seen elsewhere were earlier experiments and did not produce " +
          "the production models.",
        verification: "verified",
        source: "docs/evaluation/README.md",
        tags: ["training", "provenance", "pytorch"],
      },
      {
        id: "fer-training",
        title: "FER Training",
        content:
          "**Model:** EfficientNet-B0 (ImageNet-pretrained), 224x224 RGB, 4 classes.\n\n" +
          "**Data:** FER2013 + RAF-DB + CK+ merged. Train 26,703 / validation 4,711 / test 7,717 images.\n\n" +
          "**Settings:** batch 16; head training 10 epochs at LR 1e-3, then fine-tuning 15 epochs at LR 1e-5 " +
          "(cosine decay); dropout 0.4; weight decay 1e-4; early stopping 5; seed 42. " +
          "Best checkpoint: epoch 14, validation accuracy 61.5%.",
        verification: "verified",
        source: "docs/evaluation/fer/training_config.py",
        tags: ["training", "fer", "efficientnet", "datasets"],
      },
      {
        id: "ser-training",
        title: "SER Training",
        content:
          "**Model:** Wav2Vec2-base backbone + classifier (768 → 256 → 4), raw 16 kHz mono audio.\n\n" +
          "**Data:** CREMA-D, RAVDESS, SAVEE, TESS (acted English speech; angry/happy/neutral/sad only). " +
          "Stratified 70/15/15 split, seed 42: train 5,230 / validation 1,121 / test 1,121 clips.\n\n" +
          "**Settings:** batch 16; phase 1 frozen backbone (LR 1e-3), phase 2 fine-tuning (backbone LR 1e-5); " +
          "dropout 0.3; weight decay 1e-2; warmup 10%; early stopping 5. Audio trimmed of silence, max 4 s.",
        verification: "verified",
        source: "docs/evaluation/ser/training_config.py",
        tags: ["training", "ser", "wav2vec2", "datasets"],
      },
      {
        id: "ler-training",
        title: "LER Training",
        content:
          "**Model:** XLM-RoBERTa-base + classifier (768 → 256 → 4), max 128 tokens.\n\n" +
          "**Data:** GoEmotions (50,634) + DAIR-AI Emotion (19,234) = 69,868 English texts after cleaning " +
          "(319 duplicates and 3,183 ambiguous labels such as confusion/surprise removed). " +
          "Train 55,894 / validation 6,987 / test 6,987.\n\n" +
          "**Settings:** batch 16; phase 1 frozen backbone (LR 1e-3), phase 2 unfreezes the top 4 layers " +
          "(backbone LR 1e-5, head 1e-4); class-balanced sampling; early stopping 5.",
        verification: "verified",
        source: "docs/evaluation/ler/training_config.py",
        tags: ["training", "ler", "xlm-roberta", "datasets"],
      },
      {
        id: "data-splits-leakage",
        title: "Data Splits and Leakage",
        content:
          "- **SER:** split by file, stratified by emotion — **not speaker-independent**. All 121 speakers are in both " +
          "training and test (every test clip is a familiar voice), so its accuracy is likely optimistic for a new speaker.\n" +
          "- **LER:** duplicate texts removed before splitting; only 7 of 6,987 test texts (0.1%) also appear in training.\n" +
          "- **FER:** the test set is FER2013's and RAF-DB's official test images, separate from their training images; " +
          "CK+ is only in training/validation.",
        verification: "verified",
        source: "docs/evaluation/README.md",
        tags: ["training", "splits", "leakage"],
      },
    ],
  },

  // =======================================================================
  // 6. MODEL EVALUATION AND METRICS
  // =======================================================================
  {
    id: "model-evaluation",
    title: "Model Evaluation and Metrics",
    icon: "BarChart3",
    items: [
      {
        id: "test-set-results",
        title: "Test-Set Results",
        content:
          "Each model was evaluated on a held-out test split it never saw in training:\n\n" +
          "- **SER (voice):** accuracy **90.54%**, macro F1 0.905 (1,121 clips)\n" +
          "- **LER (words):** accuracy **74.97%**, macro F1 0.731 (6,987 texts)\n" +
          "- **FER (face):** accuracy **61.15%**, macro F1 0.588 (7,717 images)\n\n" +
          "Classification reports and confusion matrices (CSV + PNG) are in `docs/evaluation/{fer,ser,ler}/`.",
        verification: "verified",
        source: "docs/evaluation/README.md",
        tags: ["evaluation", "metrics", "accuracy", "f1"],
      },
      {
        id: "per-class-f1",
        title: "F1 per Emotion",
        content:
          "- SER (voice): Angry 0.92 · Happy 0.90 · Neutral 0.89 · Sad 0.91\n" +
          "- LER (words): Angry 0.64 · Happy 0.83 · Neutral 0.64 · Sad 0.81\n" +
          "- FER (face): Angry 0.50 · Happy 0.75 · Neutral 0.57 · Sad 0.53\n\n" +
          "Full tables and confusion matrices: the Model Evaluation panel above.\n\n" +
          "Happy is the easiest emotion for all three models; Angry and Neutral are the hardest for FER and LER.",
        verification: "verified",
        source: "docs/evaluation/*/classification_report.txt",
        tags: ["evaluation", "per-class", "f1"],
      },
      {
        id: "fer-weakest",
        title: "Why FER Is the Weakest — and Why Fusion Uses Voice Too",
        content:
          "FER reaches 61%. Most of its errors are faces read as **Sad** (350 angry, 413 happy and 538 neutral test " +
          "faces). FER2013 is a hard, low-resolution, in-the-wild dataset; the 85–89% figures in the literature are " +
          "mostly for controlled datasets.\n\n" +
          "The session result fuses FER with SER (50/50, confidence-adaptive), and SER is the strongest model (91%), " +
          "so a weak face reading is balanced by the voice.",
        verification: "verified",
        source: "docs/evaluation/fer/confusion_matrix.csv",
        tags: ["evaluation", "fer", "fusion", "defense"],
      },
      {
        id: "evaluation-scope",
        title: "What These Numbers Do and Don't Show",
        content:
          "They show performance on public test sets: acted English speech (SER), English Reddit/Twitter text (LER) " +
          "and mixed face photos (FER). They do **not** measure accuracy on real Davao patients, whose language, " +
          "recording conditions and expressions differ. SER's split also keeps the same speakers in training and test.\n\n" +
          "For real interviews, `npm run eval:self-report` (backend) compares the AI with patients' own report " +
          "(mood check and feeling words). See `docs/evaluation/README.md`.",
        verification: "verified",
        source: "docs/evaluation/README.md",
        tags: ["evaluation", "limitations", "self-report"],
      },
    ],
  },

  // =======================================================================
  // 7. MULTIMODAL FUSION
  // =======================================================================
  {
    id: "fusion",
    title: "Multimodal Fusion",
    icon: "Zap",
    items: [
      {
        id: "fusion-weights",
        title: "Fusion Weights: FER=0.50, SER=0.50, LER=0.0",
        content:
          "Base weights from `fusion_config.py`:\n" +
          "- FER: **0.50**\n" +
          "- SER: **0.50**\n" +
          "- LER: **0.0** (excluded from fusion)\n\n" +
          "**NOTE:** BACKEND_GUIDE.md states 40/40/20. This is WRONG. Use code values.\n\n" +
          "LER runs in the pipeline but has zero fusion weight, so it does NOT affect final predictions.",
        verification: "verified",
        source: "src/ai/fusion/fusion_config.py",
        codeRef: "fusion_config.py:42-48",
        tags: ["fusion", "weights", "ler-excluded"],
      },
      {
        id: "fusion-algorithm",
        title: "Confidence-Adaptive Weighted Fusion Algorithm",
        content:
          "1. Filter invalid results (NoFace, Unknown excluded)\n" +
          "2. For each valid modality m: effective_weight = base_weight[m] x confidence[m]\n" +
          "3. For each emotion e: combined_scores[e] += probabilities[m][e] x effective_weight\n" +
          "4. Normalize: combined_scores[e] /= sum(effective_weights)\n" +
          "5. Winner = argmax(combined_scores)\n" +
          "6. If winner_score < 0.20 → override to Neutral\n" +
          "7. Disagreement penalty: if modalities disagree, winner_score *= (0.5 + 0.5 x agreeing_count / n_modalities)\n\n" +
          "Single modality fallback: if only one valid modality, return its result with agreement=100%.\n" +
          "No valid results: return Neutral with confidence=1.0.",
        verification: "verified",
        source: "src/ai/fusion/fusion_engine.py",
        codeRef: "fusion_engine.py:97-155",
        tags: ["fusion", "algorithm", "weighted", "confidence-adaptive"],
      },
      {
        id: "agreement-calculation",
        title: "Agreement Calculation",
        content:
          "1 unique emotion = 100% agreement\n" +
          "2 unique emotions = 66.67% agreement\n" +
          "3 unique emotions = 33.33% agreement",
        verification: "verified",
        source: "src/ai/fusion/fusion_engine.py",
        codeRef: "fusion_engine.py:293-305",
        tags: ["fusion", "agreement", "unique-emotions"],
      },
      {
        id: "distribution-algorithm",
        title: "Distribution: Simple Vote Counting",
        content:
          "Each question counts as one vote for its fused emotion. NOT weighted by confidence.",
        verification: "verified",
        source: "src/ai/ai_service.py",
        codeRef: "ai_service.py:324-335",
        tags: ["fusion", "distribution", "vote-counting"],
      },
    ],
  },

  // =======================================================================
  // 8. INTERVIEW WORKFLOW
  // =======================================================================
  {
    id: "interview-workflow",
    title: "Interview Workflow",
    icon: "FileText",
    items: [
      {
        id: "workflow-steps",
        title: "Step-by-Step Workflow (Verified from Code)",
        content:
          "1. Therapist creates question set (manual or AI-generated via Ollama)\n" +
          "2. Therapist creates interview link, assigns to patient\n" +
          "3. Patient opens link → ConsentPage (consent form, camera/mic permission)\n" +
          "4. InterviewRoom: Rapport phase (2 intro questions, TTS + speech recognition) → Formal interview (N questions)\n" +
          "5. Per question: Browser captures video frames (every 3s) + audio recording via MediaRecorder\n" +
          "6. ProcessingPage: Files uploaded via POST /api/emotion/token/:token/analyze (multipart, up to 500 files)\n" +
          "7. Node.js backend forwards to Python AI service at POST /api/analyze\n" +
          "8. Per question pipeline: FER (all frames → best) → SER → STT → LER → Fusion\n" +
          "9. Results: distribution, risk_level, indicators, spikes, report (LLM or fallback)\n" +
          "10. Session stored in DB (transcript JSONB, emotion_summary, risk_level, emotional_spikes, report)\n" +
          "11. Longitudinal report generated fire-and-forget\n" +
          "12. Therapist reviews in SessionReviewPage: overview, heatmap, per-question evidence, AI report, notes",
        verification: "verified",
        tags: ["workflow", "interview", "steps"],
      },
    ],
  },

  // =======================================================================
  // 9. REPORTS, INDICATORS, AND RECOMMENDATIONS
  // =======================================================================
  {
    id: "reports-indicators",
    title: "Reports, Indicators, and Recommendations",
    icon: "FileText",
    items: [
      {
        id: "session-report-llm",
        title: "Session Report (LLM-Generated)",
        content:
          "Generated by Llama 3.2:3B via Ollama. System prompt forbids diagnosis, requires hedging language.\n\n" +
          "Report fields: session_summary, key_emotional_findings, areas_for_attention, " +
          "therapist_evaluation, suggested_therapist_focus, suggested_follow_ups, topics_discussed, " +
          "keywords, evidence_quality, limitations.\n\n" +
          "Report source: \"llm\" field in response.",
        verification: "verified",
        source: "src/ai/report/report_generator.py",
        codeRef: "report_generator.py:27-51",
        tags: ["report", "llm", "ollama", "llama"],
      },
      {
        id: "report-fallback",
        title: "Fallback Report (Deterministic)",
        content:
          "When Ollama unavailable, deterministic report from actual session data. " +
          "Follow-up questions built from highest-confidence negative question and spikes.\n\n" +
          "Report source: \"fallback\" field in response.",
        verification: "verified",
        source: "src/ai/report/report_generator.py",
        codeRef: "report_generator.py:332-398",
        tags: ["report", "fallback", "deterministic"],
      },
      {
        id: "risk-level",
        title: "Risk Level Derivation",
        content:
          "Derived from distribution:\n" +
          "- Sad% + Angry% > 60% = **High**\n" +
          "- Sad% + Angry% > 30% = **Moderate**\n" +
          "- Else = **Low**",
        verification: "verified",
        source: "src/ai/fusion/fusion_engine.py",
        codeRef: "fusion_engine.py:158-172",
        tags: ["risk", "level", "threshold"],
      },
      {
        id: "spike-detection-rules",
        title: "Spike Detection (6 Rules)",
        content:
          "1. Transition: Neutral/Happy → Sad/Angry, confidence > 0.5\n" +
          "2. High-confidence negative: Sad/Angry with confidence >= 0.7\n" +
          "3. Emotion flip: Sad ↔ Angry, confidence > 0.5\n" +
          "4. Intensification: Same negative emotion, confidence increase > 0.1\n" +
          "5. Modality alert: Any modality detects Sad/Angry at >= 80% but fused result differs\n" +
          "6. Complete disagreement: All modalities detect different emotions",
        verification: "verified",
        source: "src/ai/fusion/fusion_engine.py",
        codeRef: "fusion_engine.py:197-290",
        tags: ["spike", "detection", "rules"],
      },
      {
        id: "recommendation-page-bug",
        title: "RecommendationPage: HARDCODED Risk Level (Known Bug)",
        content:
          "RecommendationPage has `const RISK_LEVEL = \"Moderate\"` hardcoded at line 23. " +
          "NOT connected to actual session data. Patients always see \"Moderate\" risk regardless of results.",
        verification: "verified",
        codeRef: "RecommendationPage.tsx:23",
        tags: ["recommendation", "hardcoded", "bug"],
      },
      {
        id: "longitudinal-report",
        title: "Longitudinal Report",
        content:
          "Deterministic analysis first, LLM interpretation second. " +
          "Computes per-session trends, early vs recent changes, recurring indicators.",
        verification: "verified",
        source: "src/ai/report/report_generator.py",
        codeRef: "report_generator.py:450-1178",
        tags: ["report", "longitudinal", "cross-session"],
      },
    ],
  },

  // =======================================================================
  // 10. LIMITATIONS AND ETHICS
  // =======================================================================
  {
    id: "limitations-ethics",
    title: "Limitations and Ethics",
    icon: "Shield",
    items: [
      {
        id: "not-diagnostic",
        title: "NOT Standalone Diagnosis",
        content:
          "System purpose: AI-assisted emotional-state pre-evaluation. NOT standalone diagnosis. " +
          "Does not screen for, detect, or diagnose depression or any mental health condition.",
        verification: "verified",
        source: "src/ai/report/report_generator.py",
        tags: ["ethics", "diagnosis", "limitations"],
      },
      {
        id: "model-accuracy-limits",
        title: "Model Outputs May Be Incorrect",
        content:
          "Model outputs may be incorrect. Facial expressions and vocal tone are indirect indicators " +
          "of emotional state, not direct measurements.",
        verification: "verified",
        tags: ["limitations", "accuracy", "indirect"],
      },
      {
        id: "dataset-limitations",
        title: "Dataset Limitations",
        content:
          "Trained on public datasets: acted English speech (CREMA-D, RAVDESS, SAVEE, TESS), English online text " +
          "(GoEmotions, DAIR-AI) and face photos (FER2013, RAF-DB, CK+). None were collected in Davao. " +
          "Models may not generalize to all populations, languages, lighting conditions or audio environments.",
        verification: "verified",
        source: "docs/evaluation/README.md",
        tags: ["limitations", "dataset", "generalization"],
      },
      {
        id: "missing-modality-handling",
        title: "Missing Modality Handling",
        content:
          "If camera off → FER excluded. If no audio → SER excluded. Fusion adapts.",
        verification: "verified",
        source: "src/ai/fusion/fusion_engine.py",
        tags: ["limitations", "missing", "modality"],
      },
      {
        id: "language-limitations",
        title: "Language: No Language-Specific Evaluation",
        content:
          "STT auto-detects tl/ceb/en. SER is language-agnostic (raw waveform). LER processes text. " +
          "No language-specific evaluation available.",
        verification: "verified",
        tags: ["limitations", "language", "evaluation"],
      },
      {
        id: "cultural-context",
        title: "Cultural Context",
        content:
          "Emotion expression varies across cultures. Models trained on specific datasets " +
          "may not capture this. Individual differences (baseline expression, neurodivergence) affect accuracy.",
        verification: "verified",
        tags: ["limitations", "culture", "individual"],
      },
      {
        id: "professional-interpretation",
        title: "Professional Interpretation Required",
        content:
          "Results are supplementary tools for therapists, not replacements for clinical judgment. " +
          "All system outputs require interpretation by a licensed mental health professional.",
        verification: "verified",
        tags: ["ethics", "professional", "interpretation"],
      },
    ],
  },

  // =======================================================================
  // 11. SECURITY AND PRIVACY
  // =======================================================================
  {
    id: "security-privacy",
    title: "Security and Privacy",
    icon: "Shield",
    items: [
      {
        id: "consent",
        title: "Consent",
        content:
          "Patient must accept consent form before interview starts. Camera/mic permission requested. " +
          "Interview cannot proceed without consent and media permissions.",
        verification: "verified",
        tags: ["security", "consent"],
      },
      {
        id: "data-flow",
        title: "Data Flow",
        content:
          "Browser → Node.js (port 5000) → Python AI (port 8001). All local processing. " +
          "No external API calls for inference.",
        verification: "verified",
        tags: ["security", "data-flow", "local"],
      },
      {
        id: "data-storage",
        title: "Data Storage",
        content:
          "Session data in PostgreSQL. Frame images stored as base64 in transcript JSONB. " +
          "Audio not permanently stored (processed then discarded).\n\n" +
          "**Base64 encoding is NOT encryption.**",
        verification: "verified",
        tags: ["security", "storage", "postgresql", "base64"],
      },
      {
        id: "authentication",
        title: "Authentication",
        content:
          "JWT-based. Therapist login required for protected routes. Patient access via unique token.",
        verification: "verified",
        tags: ["security", "auth", "jwt"],
      },
      {
        id: "ra-10173",
        title: "RA 10173 Compliance",
        content:
          "RA 10173 (Data Privacy Act of 2012) referenced in UI disclaimer. " +
          "Compliance claim NOT independently verified.",
        verification: "partially-verified",
        tags: ["security", "privacy", "ra-10173"],
      },
      {
        id: "no-encryption-at-rest",
        title: "No Encryption at Rest Verified",
        content:
          "No encryption at rest verified from code. Base64 encoding is NOT encryption. " +
          "No secrets or API keys exposed in frontend code.",
        verification: "verified",
        tags: ["security", "encryption", "storage"],
      },
    ],
  },

  // =======================================================================
  // 12. THESIS DEFENSE REFERENCE (18 Panel Questions)
  // =======================================================================
  {
    id: "defense-reference",
    title: "Thesis Defense Reference",
    icon: "GraduationCap",
    items: [
      {
        id: "q1-problem",
        title: "Q1: What problem does Amumata address?",
        content:
          "Manual emotional assessment is subjective and time-consuming. " +
          "Amumata provides AI-assisted pre-evaluation using facial and vocal cues.",
        verification: "verified",
        tags: ["defense", "q1", "problem"],
      },
      {
        id: "q2-why-fer-ser",
        title: "Q2: Why use FER and SER?",
        content:
          "Facial expressions and vocal tone are established indicators of emotional state. " +
          "Multimodal approach provides richer signal than single modality. " +
          "Facial and vocal cues can confirm or contradict each other.",
        verification: "verified",
        tags: ["defense", "q2", "fer", "ser", "multimodal"],
      },
      {
        id: "q3-efficientnet",
        title: "Q3: Why EfficientNet-B0 for FER?",
        content:
          "EfficientNet-B0 offers good accuracy-to-efficiency ratio. " +
          "Pretrained on ImageNet provides transfer learning for visual features.",
        verification: "verified",
        tags: ["defense", "q3", "efficientnet"],
      },
      {
        id: "q4-wav2vec2",
        title: "Q4: Why Wav2Vec2 for SER?",
        content:
          "Wav2Vec2 learns speech representations directly from raw waveforms, " +
          "avoiding hand-crafted feature extraction. Pretrained on large speech corpora (960h LibriSpeech).",
        verification: "verified",
        tags: ["defense", "q4", "wav2vec2"],
      },
      {
        id: "q5-datasets",
        title: "Q5: What datasets were used?",
        content:
          "- **FER:** FER2013 26,217 · RAF-DB 12,488 · CK+ 426 (39,131 images)\n" +
          "- **SER:** CREMA-D 4,900 · TESS 1,600 · RAVDESS 672 · SAVEE 300 (7,472 clips, 121 speakers)\n" +
          "- **LER:** GoEmotions 50,634 · DAIR-AI Emotion 19,234 (69,868 texts after cleaning)\n\n" +
          "Details and split sizes: `docs/evaluation/README.md`.",
        verification: "verified",
        source: "docs/evaluation/README.md",
        tags: ["defense", "q5", "datasets"],
      },
      {
        id: "q6-preprocessing",
        title: "Q6: How were datasets preprocessed?",
        content:
          "- **FER:** face crop, resized to 224x224 RGB, ImageNet normalization — same size in training and production.\n" +
          "- **SER:** 16 kHz mono, silence trimmed. Training clips were up to 4 s; production analyses up to 3.0 s " +
          "after a 0.5 s offset.\n" +
          "- **LER:** XLM-RoBERTa tokenizer, 128 tokens max; training texts de-duplicated and ambiguous labels removed.",
        verification: "verified",
        source: "src/ai/fer/fer_service.py",
        codeRef: "fer_service.py:95-112",
        tags: ["defense", "q6", "preprocessing"],
      },
      {
        id: "q7-data-leakage",
        title: "Q7: How was data leakage prevented?",
        content:
          "Each model used separate train/validation/test splits (seed 42), and the test set was only used for the " +
          "final evaluation. LER removed duplicate texts before splitting.\n\n" +
          "FER's test set is the official test portion of FER2013 and RAF-DB; LER has only 7 test texts (0.1%) also in training.\n\n" +
          "**Be ready to acknowledge:** SER's split is by file, not by speaker — all 121 speakers are in both training " +
          "and test, so its 90.5% is likely optimistic for a new voice.",
        verification: "verified",
        source: "docs/evaluation/README.md",
        tags: ["defense", "q7", "data-leakage"],
      },
      {
        id: "q8-model-evaluation",
        title: "Q8: How were models evaluated?",
        content:
          "On held-out test sets, with accuracy, per-class precision/recall/F1 and confusion matrices:\n" +
          "SER 90.54%, LER 74.97%, FER 61.15% accuracy (macro F1 0.905 / 0.731 / 0.588).\n\n" +
          "In real interviews, the AI is also compared with the patient's own report (mood check, feeling words) " +
          "via `npm run eval:self-report`.",
        verification: "verified",
        source: "docs/evaluation/README.md",
        tags: ["defense", "q8", "evaluation"],
      },
      {
        id: "q9-confidence-scores",
        title: "Q9: What do confidence scores mean?",
        content:
          "Softmax probabilities across 4 classes. Not calibrated accuracy. " +
          "Confidence guards exist (FER: 0.40/0.15, SER: 0.50/0.20).\n\n" +
          "A score of 0.85 means the model estimates 85% probability, NOT 85% accuracy.",
        verification: "verified",
        tags: ["defense", "q9", "confidence", "softmax"],
      },
      {
        id: "q10-fusion-combined",
        title: "Q10: How are FER and SER combined?",
        content:
          "Confidence-adaptive weighted fusion, 50/50 base weights. " +
          "Effective weight = base x confidence. Disagreement penalty applied.\n\n" +
          "Higher-confidence predictions have more influence on the final result.",
        verification: "verified",
        source: "src/ai/fusion/fusion_engine.py",
        tags: ["defense", "q10", "fusion"],
      },
      {
        id: "q11-disagreement",
        title: "Q11: What happens when modalities disagree?",
        content:
          "Disagreement penalty reduces confidence. Agreement ratio calculated. " +
          "Spike detection triggers on modality alert.\n\n" +
          "If modalities disagree: winner_score *= (0.5 + 0.5 x agreement_ratio). " +
          "If score falls below 0.20 → override to Neutral.",
        verification: "verified",
        source: "src/ai/fusion/fusion_engine.py",
        tags: ["defense", "q11", "disagreement"],
      },
      {
        id: "q12-poor-recordings",
        title: "Q12: How does the system handle poor recordings?",
        content:
          "FER: confidence guard → Neutral. " +
          "SER: silence detection (RMS<0.005), minimum duration (1.0s), confidence guard → Neutral.",
        verification: "verified",
        source: "src/ai/ser/ser_service.py",
        codeRef: "config.py:108, ser_service.py:141-154",
        tags: ["defense", "q12", "poor-recordings"],
      },
      {
        id: "q13-diagnose-depression",
        title: "Q13: Does the system diagnose depression?",
        content:
          "**NO.** System provides emotional indicators. Report uses hedging language. " +
          "Explicitly forbids diagnosis in system prompt.",
        verification: "verified",
        source: "src/ai/report/report_generator.py",
        codeRef: "report_generator.py:27-51",
        tags: ["defense", "q13", "diagnosis", "ethics"],
      },
      {
        id: "q14-privacy-consent",
        title: "Q14: How are privacy and consent handled?",
        content:
          "Consent form required. JWT auth. Local processing. Base64 storage (NOT encryption). " +
          "No encryption at rest verified from code.",
        verification: "verified",
        tags: ["defense", "q14", "privacy", "consent"],
      },
      {
        id: "q15-main-limitations",
        title: "Q15: What are the main limitations?",
        content:
          "FER is the weakest model (61% test accuracy). Models were trained on public, mostly English and acted " +
          "data, not Davao patients; SER's split is not speaker-independent; there is no Tagalog/Bisaya-specific " +
          "evaluation; accuracy on real patients is only measured indirectly (agreement with self-report).",
        verification: "verified",
        tags: ["defense", "q15", "limitations"],
      },
      {
        id: "q16-implemented-vs-planned",
        title: "Q16: What is implemented vs planned?",
        content:
          "**Implemented:** FER/SER/STT/fusion/report. LER implemented but excluded (weight=0).\n\n" +
          "**Planned/Deferred:** Recording playback (RA 10173 ethics burden). Session comparison deferred.",
        verification: "verified",
        tags: ["defense", "q16", "implemented", "planned"],
      },
      {
        id: "q17-evidence-system-works",
        title: "Q17: What evidence demonstrates the system works?",
        content:
          "**Model level:** test-set accuracy, precision, recall, F1 and confusion matrices for all three models " +
          "(`docs/evaluation/`).\n\n" +
          "**Real interviews:** agreement between the AI and the patient's own report — mood before/after and " +
          "feeling words per question — computed by `npm run eval:self-report` once interviews are collected.\n\n" +
          "**Still missing:** a user study with therapists (usability and usefulness), and comparison with a " +
          "clinician's own assessment.",
        verification: "partially-verified",
        source: "docs/evaluation/README.md",
        tags: ["defense", "q17", "evidence"],
      },
      {
        id: "q18-improvements",
        title: "Q18: What improvements remain?",
        content:
          "1. Re-evaluate SER with a speaker-independent split\n" +
          "2. Improve FER (more varied face data, or fine-tuning on local faces with consent)\n" +
          "3. Collect real interviews and report agreement with patients' self-report\n" +
          "4. Therapist user study\n" +
          "5. Update BACKEND_GUIDE.md (fusion weights 50/50/0, not 40/40/20)",
        verification: "verified",
        tags: ["defense", "q18", "improvements", "roadmap"],
      },
      {
        id: "defense-readiness-summary",
        title: "Defense Readiness Summary",
        content:
          "**Verified strengths:** Complete pipeline, multimodal fusion, confidence guards, spike detection, hedging reports. " +
          "Test-set results for all three models (SER 90.5%, LER 75.0%, FER 61.2%) with training settings documented.\n\n" +
          "**Be ready to explain:** FER's lower accuracy (and why fusion leans on voice); SER's speaker-dependent split; " +
          "public English training data vs Davao patients.\n\n" +
          "**Still missing:** agreement with patients' self-report on real interviews (script ready), therapist user study.\n\n" +
          "**Claims to qualify:** \"4 emotions\" (thesis says 3), fusion weights (docs say 40/40/20, code says 50/50/0).\n\n" +
          "**Recommended next steps:**\n" +
          "1. Collect interviews and run `npm run eval:self-report`\n" +
          "2. Update the thesis with the evaluation results\n" +
          "3. Update BACKEND_GUIDE.md",
        verification: "verified",
        tags: ["defense", "readiness", "summary"],
      },
    ],
  },

  // =======================================================================
  // 13. KNOWN ISSUES AND MISSING EVIDENCE
  // =======================================================================
  {
    id: "known-issues",
    title: "Known Issues and Missing Evidence",
    icon: "AlertCircle",
    items: [
      {
        id: "issue-ser-speaker-dependent-split",
        title: "SER Test Split Is Speaker-Dependent",
        content:
          "SER's train/test split is by file, so the same actors appear in both. Its 90.5% test accuracy is likely " +
          "optimistic for new speakers; a split that holds out whole actors would give a stricter figure.",
        verification: "verified",
        source: "docs/evaluation/README.md",
        tags: ["issues", "ser", "evaluation", "leakage"],
      },
      {
        id: "issue-real-patient-evaluation",
        title: "No Evaluation on Real Patients Yet",
        content:
          "Test-set results exist for all three models (`docs/evaluation/`), but performance on real interviews is " +
          "not yet measured. The self-report comparison (`npm run eval:self-report`) needs collected interviews.",
        verification: "verified",
        source: "docs/evaluation/README.md",
        tags: ["issues", "evaluation", "self-report"],
      },
      {
        id: "issue-stale-documentation",
        title: "Stale Documentation (BACKEND_GUIDE.md)",
        content:
          "BACKEND_GUIDE.md says 40/40/20 fusion weights, actual is 50/50/0. " +
          "The code is the source of truth.",
        verification: "verified",
        source: "docs/BACKEND_GUIDE.md",
        tags: ["issues", "documentation", "fusion-weights"],
      },
      {
        id: "issue-emotion-count-discrepancy",
        title: "Emotion Count Discrepancy",
        content:
          "Thesis says 3 emotions, code uses 4 (Neutral added).",
        verification: "verified",
        tags: ["issues", "thesis", "emotions"],
      },
      {
        id: "issue-recommendation-hardcoded",
        title: "RecommendationPage Hardcoded",
        content:
          "`const RISK_LEVEL = \"Moderate\"` at line 23, not connected to actual data.",
        verification: "verified",
        codeRef: "RecommendationPage.tsx:23",
        tags: ["issues", "hardcoded", "recommendation"],
      },
      {
        id: "issue-ler-excluded",
        title: "LER Excluded (Weight=0)",
        content:
          "Runs in pipeline but fusion weight=0.0, doesn't affect results. " +
          "Wastes compute and creates false impression that language analysis contributes.",
        verification: "verified",
        source: "src/ai/fusion/fusion_config.py",
        codeRef: "fusion_config.py:42-48",
        tags: ["issues", "ler", "excluded", "weight"],
      },
      {
        id: "issue-stt-not-in-proposal",
        title: "STT Not in Thesis Proposal",
        content:
          "Whisper large-v3 is a major component with no mention in the original proposal. " +
          "Added to support LER and provide transcripts.",
        verification: "verified",
        source: "src/ai/stt/stt_service.py",
        tags: ["issues", "stt", "whisper", "proposal"],
      },
    ],
  },
];