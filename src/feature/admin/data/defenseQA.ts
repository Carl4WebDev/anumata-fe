/**
 * Thesis defense Q&A for the admin page. Every number here comes from the code,
 * its configuration (anumata-be/src/ai/config.py, fusion_engine.py, the interview
 * hooks) or the evaluation files (anumata-be/docs/evaluation/). Update this file
 * when a model is retrained or a setting changes.
 */

export const QA_CATEGORIES = [
  "Overview",
  "AI models & accuracy",
  "Datasets & cleaning",
  "Fusion, risk & spikes",
  "Interview room",
  "Questions & question sets",
  "Accounts, PRC & admin",
  "Security, privacy & ethics",
  "Architecture & deployment",
  "Limitations & future work",
] as const;

export type QACategory = (typeof QA_CATEGORIES)[number];

export interface DefenseQA {
  id: string;
  category: QACategory;
  question: string;
  /** Plain text; lines starting with "- " are shown as bullets. */
  answer: string;
  /** The figures to remember, shown as chips. */
  keyNumbers?: string[];
  /** Extra words that should match a search. */
  tags?: string[];
}

export const DEFENSE_QA: DefenseQA[] = [
  // ── Overview ────────────────────────────────────────────────────────────
  {
    id: "problem",
    category: "Overview",
    question: "What problem does Amumata address?",
    answer:
      "Therapists in Davao City often meet a patient for the first time with little information about how the patient feels. Amumata gives them an AI-assisted emotional pre-evaluation before the first session: the patient answers guided questions by voice in a private online interview, and the system reports the emotional indicators it detected for the therapist to review.\n" +
      "It is decision support only — it never diagnoses, and the therapist makes every clinical judgement.",
    tags: ["purpose", "goal", "pre-evaluation"],
  },
  {
    id: "what-it-does",
    category: "Overview",
    question: "What does the system do, end to end?",
    answer:
      "- The therapist prepares a question set and sends the patient a private interview link.\n" +
      "- The patient consents, checks camera and microphone, and talks with Amumata, which asks each question aloud (English, Tagalog or Bisaya).\n" +
      "- Each answer is analysed from three sources: face (FER), voice (SER) and words (LER).\n" +
      "- Face and voice are fused into one emotion per answer; risk level and emotional spikes are computed.\n" +
      "- An AI-written summary is generated and the therapist is notified that results are ready.",
    tags: ["pipeline", "flow", "workflow"],
  },
  {
    id: "four-emotions",
    category: "Overview",
    question: "Which emotions does the system recognise, and why only these?",
    answer:
      "Four: Angry, Happy, Neutral and Sad — the same four for face, voice and words. These are the emotions shared by all the training datasets with enough examples, which lets the three models be fused on one scale. Fear, disgust and surprise were left out because they are rare or inconsistent across the datasets.",
    keyNumbers: ["4 emotions"],
    tags: ["labels", "classes"],
  },
  {
    id: "users",
    category: "Overview",
    question: "Who uses Amumata?",
    answer:
      "- Therapists: PRC-licensed psychologists, psychometricians, guidance counselors, psychiatrists and social workers who want a pre-evaluation in their workflow.\n" +
      "- Patients: they only open the interview link; they have no account.\n" +
      "- The administrator (the developer): checks licenses and monitors the system; sees account data and counts only.",
    keyNumbers: ["5 professions"],
    tags: ["roles", "therapist", "patient", "admin"],
  },

  // ── AI models & accuracy ───────────────────────────────────────────────
  {
    id: "accuracy-summary",
    category: "AI models & accuracy",
    question: "How accurate are the models?",
    answer:
      "On held-out test sets the models never saw in training:\n" +
      "- SER (voice): 90.54% accuracy, macro F1 0.905 — 1,121 clips.\n" +
      "- FER (face): 77.15% accuracy, macro F1 0.746 — 7,640 images.\n" +
      "- LER (words): 74.97% accuracy, macro F1 0.731 — 6,987 texts.\n" +
      "Accuracy is the share of test samples labelled correctly; macro F1 averages the four emotions equally, so it is not inflated by the most common emotion.",
    keyNumbers: ["SER 90.54%", "FER 77.15%", "LER 74.97%"],
    tags: ["results", "metrics", "f1", "performance"],
  },
  {
    id: "fer-model",
    category: "AI models & accuracy",
    question: "What is the face model (FER) and how well does it do?",
    answer:
      "EfficientNet-B0 (ImageNet-pretrained) with a small classifier head, on grayscale face crops resized to 224×224.\n" +
      "- Test accuracy 77.15%, macro F1 0.746, weighted F1 0.774 (7,640 images).\n" +
      "- F1 per emotion: Angry 0.693 · Happy 0.897 · Neutral 0.709 · Sad 0.686.\n" +
      "- Davao (Filipino) test photos alone: 65.22% (23 photos).\n" +
      "- Most remaining mistakes: sad read as neutral (328) and neutral read as sad (284).",
    keyNumbers: ["77.15%", "F1 0.746", "Davao 65.22%"],
    tags: ["fer", "efficientnet", "face"],
  },
  {
    id: "fer-improvement",
    category: "AI models & accuracy",
    question: "FER went from 61.15% to 77.15%. Is that a fair comparison?",
    answer:
      "The test sets differ: the new one was cleaned (duplicates and conflicting labels removed) and includes Davao photos. To compare fairly, the previous model was also run on the new cleaned test set: it scores 54.27%, against 77.15% for the new model — so the improvement is real, not just an easier test.\n" +
      "The gain came from cleaning the data and from fine-tuning more of the network (a third training stage).",
    keyNumbers: ["61.15% → 77.15%", "old model 54.27% on new test"],
    tags: ["retrain", "comparison", "fer"],
  },
  {
    id: "ser-model",
    category: "AI models & accuracy",
    question: "What is the voice model (SER) and how well does it do?",
    answer:
      "Wav2Vec2-base with a classifier head (256 hidden units, dropout 0.3), on 16 kHz audio.\n" +
      "- Test accuracy 90.54%, macro F1 0.905, weighted F1 0.906 (1,121 clips).\n" +
      "- F1 per emotion: Angry 0.924 · Happy 0.896 · Neutral 0.892 · Sad 0.909.\n" +
      "Caution: the split is speaker-dependent — all 121 speakers appear in both training and test — so 90.54% measures emotions in familiar voices; on new speakers it is likely lower.",
    keyNumbers: ["90.54%", "F1 0.905", "121 speakers"],
    tags: ["ser", "wav2vec2", "voice", "speech"],
  },
  {
    id: "ler-model",
    category: "AI models & accuracy",
    question: "What is the words model (LER), and why isn't it in the fused result?",
    answer:
      "XLM-RoBERTa-base with a classifier head, reading the transcribed answer (up to 128 tokens).\n" +
      "- Test accuracy 74.97%, macro F1 0.731 (6,987 texts).\n" +
      "It is shown to the therapist as an experimental reading but has weight 0 in the fusion: it was trained on English social-media text (Reddit, Twitter), while patients speak English, Tagalog or Bisaya.",
    keyNumbers: ["74.97%", "weight 0"],
    tags: ["ler", "xlm-roberta", "text", "language", "experimental"],
  },
  {
    id: "confidence",
    category: "AI models & accuracy",
    question: "What does the confidence shown for each answer mean?",
    answer:
      "It is the model's probability for its top emotion in that answer — not its accuracy. 80% confidence does not mean the reading is 80% likely to be right.\n" +
      "When a model is unsure, a confidence guard reports Neutral instead of guessing:\n" +
      "- FER: top probability below 0.40 and a margin over the runner-up below 0.15.\n" +
      "- SER: top probability below 0.50 and a margin below 0.20.",
    keyNumbers: ["FER guard 0.40 / 0.15", "SER guard 0.50 / 0.20"],
    tags: ["probability", "threshold", "guard", "neutral"],
  },
  {
    id: "stt",
    category: "AI models & accuracy",
    question: "How is the patient's speech turned into text?",
    answer:
      "Faster-Whisper large-v3 on the GPU (beam size 5, voice-activity filter), with a Tagalog language hint; it handles English, Tagalog and Bisaya. Live captions during the interview can come from the browser or from Whisper; the analysis always uses Whisper.",
    keyNumbers: ["Whisper large-v3"],
    tags: ["whisper", "transcription", "speech to text", "captions"],
  },
  {
    id: "report-llm",
    category: "AI models & accuracy",
    question: "Which AI writes the session summary, and can it hallucinate?",
    answer:
      "Llama 3.2 3B, run privately through Ollama on the AI server (temperature 0.3). It only rewrites the measured results into readable text with hedged wording (\"may indicate\"), never diagnoses, and is checked for the expected structure. If it fails or times out (180 s), a rule-based summary built from the same numbers is used instead.",
    keyNumbers: ["Llama 3.2 3B", "temperature 0.3"],
    tags: ["ollama", "llm", "summary", "report"],
  },

  // ── Datasets & cleaning ────────────────────────────────────────────────
  {
    id: "datasets",
    category: "Datasets & cleaning",
    question: "What datasets were used?",
    answer:
      "- FER: FER2013, RAF-DB and CK+, plus face photos collected in Davao City.\n" +
      "- SER: CREMA-D (4,900 clips), TESS (1,600), RAVDESS (672), SAVEE (300) — 7,472 clips.\n" +
      "- LER: GoEmotions (50,634 texts) and DAIR-AI Emotion (19,234) — 69,868 texts.",
    keyNumbers: ["7,472 voice clips", "69,868 texts", "37,161 face images"],
    tags: ["fer2013", "raf-db", "ck+", "crema-d", "ravdess", "tess", "savee", "goemotions"],
  },
  {
    id: "fer-cleaning",
    category: "Datasets & cleaning",
    question: "How was the face dataset cleaned?",
    answer:
      "From 39,131 images plus 155 Davao photos, 37,161 were kept. Removed:\n" +
      "- 983 duplicates (same photo, compared image by image),\n" +
      "- 700 training copies of test images (to prevent leakage),\n" +
      "- 138 images that appeared with conflicting labels,\n" +
      "- 16 blank images,\n" +
      "- 284 extra frames of the same CK+ clip (one frame kept per clip),\n" +
      "- 4 Davao photos with no detectable face.\n" +
      "All faces were converted to the same format: grayscale, face only.",
    keyNumbers: ["39,131 → 37,161", "700 test copies removed"],
    tags: ["cleaning", "duplicates", "preprocessing", "fer"],
  },
  {
    id: "davao-data",
    category: "Datasets & cleaning",
    question: "What is the Davao dataset?",
    answer:
      "Face photos of Filipino participants collected in Davao City, each showing angry, happy, neutral or sad. 155 accepted photos; 151 kept after cleaning (4 had no detectable face).\n" +
      "- Split: 105 training · 23 validation · 23 test.\n" +
      "- Faces are cropped exactly as the app crops them (Haar cascade).\n" +
      "- There were no participant IDs, so each person's photos were kept in one split by face similarity — an estimate.\n" +
      "Result on the 23 Davao test photos: 65.22%.",
    keyNumbers: ["151 photos", "105 / 23 / 23", "65.22%"],
    tags: ["filipino", "local", "davao"],
  },
  {
    id: "splits",
    category: "Datasets & cleaning",
    question: "How were the data split into training, validation and test?",
    answer:
      "- FER: 25,234 train · 4,287 validation · 7,640 test (official FER2013 and RAF-DB test images plus 23 Davao photos).\n" +
      "- SER: 5,230 · 1,121 · 1,121 (stratified 70/15/15, seed 42).\n" +
      "- LER: 55,894 · 6,987 · 6,987 (80/10/10 after cleaning).",
    keyNumbers: ["FER 7,640 test", "SER 1,121 test", "LER 6,987 test"],
    tags: ["train", "validation", "test", "split"],
  },
  {
    id: "leakage",
    category: "Datasets & cleaning",
    question: "How was data leakage prevented?",
    answer:
      "- FER: the test set is the datasets' official test portion; 700 copies of test images found in training were removed after comparing every image pair, and each CK+ person stays in one split.\n" +
      "- LER: 319 duplicate texts were removed before splitting; only 7 of 6,987 test texts (0.1%) also appear in training.\n" +
      "- SER: split by file, so speakers overlap (all 121) — this is a stated limitation.",
    keyNumbers: ["700 removed", "7 of 6,987 (0.1%)"],
    tags: ["overlap", "duplicates", "validity"],
  },
  {
    id: "fer-training",
    category: "Datasets & cleaning",
    question: "How was the face model trained?",
    answer:
      "Three stages from ImageNet weights, batch size 16, dropout 0.4, seed 42:\n" +
      "- Stage 1: only the new classifier, 10 epochs, learning rate 0.001.\n" +
      "- Stage 2: also the last network block, up to 15 epochs, learning rate 0.00001.\n" +
      "- Stage 3: the last 3 blocks, up to 20 epochs, learning rate 0.0001, stopping after 5 epochs without improvement.\n" +
      "Best model: stage 3, epoch 6, validation accuracy 75.79%. Trained on an RTX 2050 laptop GPU in about an hour.",
    keyNumbers: ["3 stages", "val 75.79%"],
    tags: ["training", "epochs", "learning rate", "gpu"],
  },

  // ── Fusion, risk & spikes ──────────────────────────────────────────────
  {
    id: "fusion",
    category: "Fusion, risk & spikes",
    question: "How are face and voice combined?",
    answer:
      "Confidence-adaptive weighted fusion. Base weights: face 50%, voice 50%, words 0%.\n" +
      "- Each model's influence = base weight × its confidence for that answer, so a more certain model counts more.\n" +
      "- Combined score per emotion = weighted average of the models' probabilities; the highest wins.\n" +
      "- If the models disagree, the winner's score is lowered: × (0.5 + 0.5 × agreeing models ÷ models).\n" +
      "- A model with no usable input (e.g. no face found) is left out for that answer.",
    keyNumbers: ["FER 50%", "SER 50%", "LER 0%"],
    tags: ["weights", "multimodal", "combine"],
  },
  {
    id: "risk",
    category: "Fusion, risk & spikes",
    question: "How is the risk level computed?",
    answer:
      "From the share of Sad and Angry in the session's fused results:\n" +
      "- High: Sad% + Angry% above 60%.\n" +
      "- Moderate: above 30%.\n" +
      "- Low: otherwise.\n" +
      "It is an indicator for the therapist's attention, not a clinical risk assessment.",
    keyNumbers: ["High > 60%", "Moderate > 30%"],
    tags: ["risk level", "high", "moderate", "low"],
  },
  {
    id: "spikes",
    category: "Fusion, risk & spikes",
    question: "What is an emotional spike?",
    answer:
      "An answer the therapist should look at. Six rules:\n" +
      "- A change from Neutral/Happy to Sad/Angry (confidence above 0.5).\n" +
      "- Sad or Angry with confidence of at least 0.7.\n" +
      "- A flip between Sad and Angry (above 0.5).\n" +
      "- The same negative emotion getting stronger by more than 0.1.\n" +
      "- One model reads Sad/Angry at 0.80 or more while the fused result differs.\n" +
      "- All three models disagree.",
    keyNumbers: ["6 rules", "≥ 0.7", "≥ 0.80"],
    tags: ["spike", "flag", "attention"],
  },
  {
    id: "disagree",
    category: "Fusion, risk & spikes",
    question: "What happens when face and voice disagree?",
    answer:
      "The more confident model counts more, the fused score is lowered by the disagreement penalty, and if one model is very sure of Sad or Angry (0.80 or more) the answer is flagged as a spike. The therapist sees each model's reading separately, not just the fused one.",
    keyNumbers: ["penalty × (0.5 + 0.5 × agree/n)"],
    tags: ["conflict", "mismatch"],
  },

  // ── Interview room ─────────────────────────────────────────────────────
  {
    id: "interview-languages",
    category: "Interview room",
    question: "Which languages can patients use?",
    answer:
      "English, Tagalog and Bisaya. Amumata detects the patient's language from the warm-up, speaks and shows questions in it, and Whisper transcribes all three.",
    keyNumbers: ["3 languages"],
    tags: ["english", "tagalog", "bisaya", "cebuano", "translation"],
  },
  {
    id: "hands-free",
    category: "Interview room",
    question: "How does the patient move to the next question?",
    answer:
      "Hands-free by voice: after 3 seconds of silence Amumata confirms and moves on (7 seconds with \"More time to think\"). The patient can also say \"repeat\" or \"wait\", or use the optional buttons.",
    keyNumbers: ["3 s", "7 s with More time"],
    tags: ["silence", "voice commands", "buttons"],
  },
  {
    id: "check-ins",
    category: "Interview room",
    question: "What happens when a patient struggles with a question?",
    answer:
      "Amumata gently asks \"Okay ka pa ba mopadayon?\" and offers continue, take a break or skip. It checks in when the patient:\n" +
      "- gives no answer for 13 seconds (10 for sensitive questions),\n" +
      "- says a short \"I don't know / ambot / ewan ko\" and stays silent 2.5 seconds,\n" +
      "- keeps the head down for 4 seconds or stays still for 6 seconds while silent 8 seconds (6 for sensitive questions).\n" +
      "At most once per question and 3 times per interview; camera cues never count on their own.",
    keyNumbers: ["max 3 per interview", "13 s / 10 s"],
    tags: ["struggle", "yuko", "tulala", "posture", "break", "skip"],
  },
  {
    id: "crisis",
    category: "Interview room",
    question: "What if a patient mentions self-harm?",
    answer:
      "If the patient says a crisis phrase, a crisis card appears at once with tap-to-call hotlines — NCMH 1553, Hopeline 0917-558-4673, In Touch 0917-800-1123 and Tawag Paglaum 0939-936-5233 — and the therapist gets an urgent notification. The interview can continue if the patient wants.",
    keyNumbers: ["NCMH 1553"],
    tags: ["suicide", "self-harm", "hotline", "safety", "urgent"],
  },
  {
    id: "patient-comfort",
    category: "Interview room",
    question: "What makes the interview comfortable for patients?",
    answer:
      "- A calm animated presence instead of a person; the patient's own video can be hidden (recording continues).\n" +
      "- A mood check before and after (5 faces).\n" +
      "- Feeling words to tap (8 words, up to 3 per question).\n" +
      "- Reassurance before starting, breaks at any time, larger text and slower voice options.\n" +
      "- A calm \"Recording for your therapist\" label instead of a red light and timer.",
    keyNumbers: ["5 faces", "8 feeling words"],
    tags: ["mood check", "feeling words", "accessibility"],
  },
  {
    id: "skipped",
    category: "Interview room",
    question: "Are skipped questions counted in the results?",
    answer:
      "No. Questions the patient skipped are marked \"Skipped by patient\" and left out of the session's emotion mix, risk level and spikes, so a skip never looks like an emotion.",
    tags: ["skip", "results"],
  },

  // ── Questions & question sets ───────────────────────────────────────────
  {
    id: "standardized-questions",
    category: "Questions & question sets",
    question: "How many standardized questions are there?",
    answer:
      "153 open-ended questions in 38 topics (e.g. sleep, family, school pressure, loss, faith and culture, distance from loved ones), written for a Davao/Filipino setting. All are marked \"draft pending review\" until a licensed professional reviews them. Therapists can also write their own questions or build a set with the AI question-set builder.",
    keyNumbers: ["153 questions", "38 topics"],
    tags: ["question bank", "topics", "review", "custom"],
  },
  {
    id: "sensitive-questions",
    category: "Questions & question sets",
    question: "How are sensitive questions handled?",
    answer:
      "A question can be marked \"Sensitive question\". Amumata says a gentle line before it and checks in sooner if the patient struggles (10 s instead of 13 s without an answer). The question bank avoids asking directly about self-harm; that stays with the therapist and the crisis card.",
    tags: ["sensitive", "grief", "trauma"],
  },
  {
    id: "question-validation",
    category: "Questions & question sets",
    question: "How will the questions be validated?",
    answer:
      "By expert review: a licensed therapist rates each question for relevance, clarity and sensitivity. Questions they reject are deactivated (not deleted), approved ones are marked with the reviewer's name, credentials and date. A Content Validity Index (CVI) can be computed from the ratings.",
    tags: ["cvi", "content validity", "expert"],
  },

  // ── Accounts, PRC & admin ──────────────────────────────────────────────
  {
    id: "prc",
    category: "Accounts, PRC & admin",
    question: "How are therapists verified?",
    answer:
      "At registration the therapist gives their profession, PRC license number and the name on their PRC ID. The administrator checks it on the PRC verification service and marks it verified or not matched (with a reason). Until verified, the therapist can use the system but gets a banner and one reminder notification a day.",
    keyNumbers: ["1 reminder a day"],
    tags: ["license", "verification", "prc"],
  },
  {
    id: "prc-automatic",
    category: "Accounts, PRC & admin",
    question: "Why isn't PRC verification automatic?",
    answer:
      "The PRC verification site is protected by Google reCAPTCHA and PRC offers no API. Getting around the captcha would defeat a government site's security measure and raise data-privacy and terms-of-use issues. So license numbers are checked automatically for format and duplicates, and the PRC lookup is done by the administrator. Automatic verification through an official API or Data Sharing Agreement with PRC is future work.",
    tags: ["recaptcha", "api", "scraping"],
  },
  {
    id: "admin",
    category: "Accounts, PRC & admin",
    question: "What can the administrator see and do?",
    answer:
      "- See therapist accounts and their license details, verify licenses, and deactivate or reactivate accounts — every action is logged with who did it and when.\n" +
      "- See system status (database, AI service, each model) and usage counts.\n" +
      "The admin never sees patient names, sessions, answers or notes — only account data and counts.",
    tags: ["admin", "audit log", "deactivate"],
  },
  {
    id: "deactivate",
    category: "Accounts, PRC & admin",
    question: "What happens when an account is deactivated?",
    answer:
      "The therapist can't log in, and if already logged in is signed out within seconds (the account's status is re-checked on every request, cached for 5 seconds). Their patients' data is kept, and the admin can reactivate the account at any time.",
    keyNumbers: ["5 s"],
    tags: ["block", "reactivate"],
  },

  // ── Security, privacy & ethics ─────────────────────────────────────────
  {
    id: "privacy",
    category: "Security, privacy & ethics",
    question: "How does the system protect patient data?",
    answer:
      "- Designed for the Data Privacy Act of 2012 (RA 10173): consent before the interview, data visible only to the patient's therapist.\n" +
      "- The AI models run on Amumata's own AI server; the summary AI runs privately (Ollama), not through a public AI service.\n" +
      "- Each therapist only reaches their own patients; the admin sees no patient data.",
    keyNumbers: ["RA 10173"],
    tags: ["data privacy", "consent", "confidentiality"],
  },
  {
    id: "security",
    category: "Security, privacy & ethics",
    question: "How are accounts secured?",
    answer:
      "- Passwords are hashed with bcrypt; at least 8 characters with uppercase, a number and a symbol, and common or personal passwords are refused.\n" +
      "- Sign-in tokens last 7 days; login is limited to 5 attempts per 15 minutes.\n" +
      "- Therapists must accept the current Terms of Use, Privacy Notice and Responsible Use Agreement to register.",
    keyNumbers: ["bcrypt", "5 tries / 15 min", "7-day token"],
    tags: ["password", "jwt", "rate limit", "authentication"],
  },
  {
    id: "ethics",
    category: "Security, privacy & ethics",
    question: "Does Amumata diagnose mental illness?",
    answer:
      "No. It reports emotional indicators with hedged wording; it never diagnoses depression, anxiety or any condition, and never decides suicide risk. Every output is for a licensed professional to interpret.",
    tags: ["diagnosis", "decision support", "disclaimer"],
  },

  // ── Architecture & deployment ──────────────────────────────────────────
  {
    id: "architecture",
    category: "Architecture & deployment",
    question: "What is the system architecture?",
    answer:
      "- Frontend: React + TypeScript (Vite), hosted on Netlify.\n" +
      "- Backend: Node.js + Express with PostgreSQL, hosted on Render.\n" +
      "- AI service: Python (FastAPI) with FER, SER, LER, Whisper and Ollama, running on a Modal GPU (L4, falling back to T4 or A10); the trained models live in a Modal storage volume.",
    keyNumbers: ["3 parts"],
    tags: ["stack", "netlify", "render", "modal", "react", "express", "postgresql", "fastapi"],
  },
  {
    id: "speed",
    category: "Architecture & deployment",
    question: "How long does the analysis take?",
    answer:
      "In the development data, results were ready on average about 4.6 minutes after an interview ended (measured from the system's own notifications; see Admin → Overview for the live figure). The AI server sleeps when idle and takes 1–3 minutes to wake; it starts waking when the patient opens their link, so it is ready by the time the interview ends.",
    keyNumbers: ["≈ 4.6 min", "1–3 min wake-up"],
    tags: ["processing time", "performance", "modal", "cold start"],
  },
  {
    id: "self-report",
    category: "Architecture & deployment",
    question: "How is the AI compared with what patients say about themselves?",
    answer:
      "The command npm run eval:self-report compares the AI's readings in real interviews with the patient's own mood check and the feeling words they tapped, and writes the agreement to docs/evaluation/self-report/.",
    tags: ["agreement", "evaluation", "real interviews"],
  },

  // ── Limitations & future work ──────────────────────────────────────────
  {
    id: "limitations",
    category: "Limitations & future work",
    question: "What are the main limitations?",
    answer:
      "- SER's test voices were also in training (speaker-dependent), and it was trained on acted English speech.\n" +
      "- LER was trained on English text, so it is kept out of the fusion.\n" +
      "- The Davao face set is small (23 test photos); sad is the weakest Davao emotion (0 of 4).\n" +
      "- FER still confuses sad and neutral most often.\n" +
      "- The standardized questions are pending expert review.",
    tags: ["weakness", "constraints"],
  },
  {
    id: "future-work",
    category: "Limitations & future work",
    question: "What would you improve next?",
    answer:
      "- Collect more Davao photos (especially angry and sad) and voice recordings, with participant IDs, to train and test on local data.\n" +
      "- Re-split SER by speaker for a stricter test, and train LER on Tagalog/Bisaya text.\n" +
      "- Automatic PRC verification through an official API or data-sharing agreement.\n" +
      "- A therapist user study and expert review of the questions.",
    tags: ["improvement", "next steps", "recommendations"],
  },
];
