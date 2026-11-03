import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  SkipForward,
  StopCircle,
  Volume2,
  VolumeX,
  RotateCcw,
  MessageCircle,
  Check,
  Hand,
  Send,
  ChevronDown,
  ChevronUp,
  Loader2,
  Coffee,
  Play,
  ScanFace,
  Eye,
  EyeOff,
} from "lucide-react";
import { interviewLinksApi } from "../../../shared/api/interviewLinksApi";
import { translateQuestion, type QuestionLanguage } from "../../../shared/api/translateApi";
import { addFiles, deleteFiles, storeFiles } from "../../../shared/utils/fileStorage";
import { clearProgress, loadProgress, saveProgress, type InterviewProgress } from "../hooks/interviewProgress";
import { emotionApi } from "../../../shared/api/emotionApi";
import { addStagedNames, clearStagedNames } from "../../../shared/utils/earlyUpload";
import { useTTS } from "../hooks/useTTS";
import {
  detectRapportCategory,
  detectResponseLanguage,
  pickAcknowledgment,
  fillName,
  TTS_LOCALE,
  INTRO_LINES,
  RAPPORT_QUESTIONS,
  PERMISSION_LINES,
  type LocalizedLine,
  type ResponseLanguage,
} from "../hooks/rapportUtils";
import { useLiveCaptions, type CaptionPhrase } from "../hooks/useLiveCaptions";
import { isExplicitDone, parseVoiceCommand } from "../hooks/voiceCommands";
import { decideTurn, questionTiming, WARMUP_TIMING } from "../hooks/handsFree";
import {
  CONVERSATION_LINES,
  voiceTips,
  REASSURANCE_LINE,
  VOICE_FALLBACK_NOTE,
  closingLine,
  transitionLine,
  type ConversationLine,
} from "../hooks/conversationLines";
import CaptionPanel from "../components/CaptionPanel";
import { useLeaveWarning, useScreenWakeLock } from "../hooks/interviewGuards";
import { useMicCheck } from "../hooks/useMicCheck";
import MicCheckPanel from "../components/MicCheckPanel";
import ComfortToggles from "../components/ComfortToggles";
import { useComfortSettings } from "../hooks/comfortSettings";
import { useKeepAiAwake } from "../../../shared/hooks/useKeepAiAwake";
import { detectCrisis } from "../hooks/crisisDetection";
import { useFaceCheck } from "../hooks/useFaceCheck";
import { FACE_HINTS } from "../hooks/faceCheck";
import CrisisCard from "../components/CrisisCard";
import AmumataPresence, { type PresenceMood } from "../components/AmumataPresence";
import { followUpsOf, shouldAskFollowUp } from "../hooks/followUps";
import { MOOD_QUESTIONS, type MoodMoment, type SelfReport } from "../hooks/moodCheck";
import MoodCheck from "../components/MoodCheck";
import FeelingWords from "../components/FeelingWords";
import { toggleFeeling } from "../hooks/feelingWords";
import CheckInActions from "../components/CheckInActions";
import { createPostureTracker } from "../hooks/postureCheck";
import {
  CHECK_IN_LINE,
  CHECK_IN_OKAY,
  SENSITIVE_INTRO,
  decideCheckIn,
  sensitiveFlagsOf,
  soundsHardToAnswer,
  type CheckInOutcome,
  type CheckInReason,
} from "../hooks/struggleCheck";

// Hardcoded fallback questions if token not found
const FALLBACK_QUESTIONS = [
  "Can you tell me about yourself and how you've been feeling lately?",
  "Is there a specific situation that has been causing you stress recently?",
  "How do you usually cope when you feel overwhelmed?",
  "Can you describe a moment this week when you felt happy or at peace?",
  "Is there anything about your daily life you wish was different?",
  "How would you describe your relationship with the people closest to you?",
];

type InterviewState =
  | "rapport_intro"
  | "rapport_wait"
  | "rapport_chat"
  | "permission_wait"
  | "mood_before"
  | "mood_after"
  | "idle"
  | "recording"
  | "finished";

/** Within a voice turn: Amumata talking, listening to the patient, or waiting for a reply to a check-in. */
type TurnPhase = "preparing" | "speaking" | "listening" | "confirming" | "busy";

// Longest the patient waits for a question's translation before it's asked in English.
const TRANSLATION_WAIT_MS = 2500;

/** What Amumata is currently saying, for the prompt card. */
type AiPrompt =
  | { kind: "localized"; line: LocalizedLine; primary: ResponseLanguage | "all" }
  | { kind: "text"; main: string; sub?: string };

const TICK_MS = 500;

// Face photos are shrunk to this size before upload (keeps the database small).
const FRAME_MAX_SIDE = 640;
const FRAME_JPEG_QUALITY = 0.7;

/**
 * Prompt text. Before the patient's language is known, show all three so the
 * patient can read theirs; after, lead with their language + English.
 */
function LocalizedBubble({
  line,
  primary,
  large = false,
}: {
  line: LocalizedLine;
  primary: ResponseLanguage | "all";
  large?: boolean;
}) {
  const [main, ...rest] =
    primary === "all" ? [line.en, line.tl, line.ceb] : primary === "en" ? [line.en] : [line[primary], line.en];
  return (
    <>
      <span>{main}</span>
      {rest.map((text) => (
        <span key={text} className={`mt-2 block font-normal text-slate-400 ${large ? "text-lg" : "text-sm"}`}>
          {text}
        </span>
      ))}
    </>
  );
}

/** "Moving on in 3…" — ticks down to the automatic next question. */
function MoveOnCountdown({ until }: { until: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);
  const seconds = Math.max(0, Math.ceil((until - now) / 1000));
  return (
    <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-center text-sm font-medium text-amber-200" role="timer">
      {seconds > 0 ? `Moving on in ${seconds}… keep talking to continue your answer` : "Moving on…"}
    </p>
  );
}

const formatTime = (seconds: number) =>
  `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

export default function InterviewRoom() {
  const { token } = useParams();
  const navigate = useNavigate();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const capturedFramesRef = useRef<Map<number, Blob[]>>(new Map());
  const capturedAudioRef = useRef<Map<number, Blob>>(new Map());
  const frameIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [questions, setQuestions] = useState<string[]>([]);
  const [patientName, setPatientName] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [state, setState] = useState<InterviewState>("idle");
  const [phase, setPhase] = useState<TurnPhase>("speaking");
  const [moveOnAt, setMoveOnAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [cameraError, setCameraError] = useState("");
  const [linkValid, setLinkValid] = useState(true);
  const [rapportResponses, setRapportResponses] = useState<{ question: string; answer: string; acknowledgment: string }[]>([]);
  const [typedAnswer, setTypedAnswer] = useState("");
  const [handsFree, setHandsFree] = useState(true);
  const [controlsOpen, setControlsOpen] = useState(true);
  const [aiPrompt, setAiPrompt] = useState<AiPrompt | null>(null);
  // A short line Amumata says between prompts (check-in, "take your time"…).
  const [spokenLine, setSpokenLine] = useState<ConversationLine | null>(null);
  // Patient's base language — learned from their first answer, then used for
  // question wording, check-ins, acknowledgments, and the TTS voice.
  const [detectedLang, setDetectedLang] = useState<ResponseLanguage>("en");
  const [langDetected, setLangDetected] = useState(false);
  // "I need a break": recording, timer and hands-free all pause until "ready".
  const [onBreak, setOnBreak] = useState(false);
  const onBreakRef = useRef(false);
  // Words that may mean self-harm: help card for the patient, urgent alert to the therapist (once).
  const [crisis, setCrisis] = useState<{ notified: boolean } | null>(null);
  const crisisRaisedRef = useRef(false);
  // Progress from before a refresh (offered on the start screen), and the
  // per-answer saves of recordings to the browser, one at a time.
  const [savedProgress, setSavedProgress] = useState<InterviewProgress | null>(() => (token ? loadProgress(token) : null));
  const fileSaveQueueRef = useRef<Promise<unknown>>(Promise.resolve());
  const fileSaveFailedRef = useRef(false);

  // Latest values for the async conversation flow (which outlives renders).
  const stateRef = useRef(state);
  const phaseRef = useRef<TurnPhase>("speaking");
  const langRef = useRef<ResponseLanguage>("en");
  const handsFreeRef = useRef(handsFree);
  const currentIndexRef = useRef(0);
  const rapportIndexRef = useRef(0);
  const elapsedRef = useRef(0);
  const listenSinceRef = useRef(0);
  const confirmAskedAtRef = useRef<number | null>(null);
  const turnTextRef = useRef<string[]>([]);
  const turnLangRef = useRef("");
  const answersRef = useRef<Map<number, string>>(new Map());
  const nudgedRef = useRef(false);
  const flowBusyRef = useRef(false);
  const questionTransCacheRef = useRef<Map<string, Promise<string | null>>>(new Map());
  const translationQueueRef = useRef<Promise<unknown>>(Promise.resolve());
  const questionsRef = useRef<string[]>([]);
  // The therapist's follow-up for each question, and which ones were already asked.
  const followUpsRef = useRef<(string | null)[]>([]);
  const followUpAskedRef = useRef<Set<number>>(new Set());
  // Phrases of this turn said before the current prompt (a follow-up keeps adding to the same answer).
  const answerBaseRef = useRef(0);
  // The patient's mood before / after (tapped faces), and the tap the mood check is waiting for.
  const moodRef = useRef<SelfReport>({ mood_before: null, mood_after: null });
  const moodResolveRef = useRef<((mood: number | null) => void) | null>(null);
  // When the patient next sees their therapist (from the link), for "what happens next".
  const nextAppointmentRef = useRef<string | null>(null);
  // Feeling words tapped per question (the patient's own words for how they feel).
  const [feelings, setFeelings] = useState<Record<number, string[]>>({});
  const feelingsRef = useRef<Record<number, string[]>>({});
  // Gentle check-ins when the patient struggles, and questions they skipped (see struggleCheck.ts).
  const sensitiveRef = useRef<boolean[]>([]);
  const checkInsRef = useRef<Record<number, { reason: CheckInReason; outcome: CheckInOutcome }>>({});
  const skippedRef = useRef<Set<number>>(new Set());
  const hardWordsAtRef = useRef<number | null>(null);
  const postureRef = useRef(createPostureTracker());
  // A check-in is waiting for the patient's reply (continue / break / skip).
  const [checkInOpen, setCheckInOpenState] = useState(false);
  const checkInOpenRef = useRef(false);
  const sessionInfoRef = useRef({ patientName, templateName, rapportResponses });
  useEffect(() => {
    stateRef.current = state;
    handsFreeRef.current = handsFree;
    elapsedRef.current = elapsed;
    questionsRef.current = questions;
    sessionInfoRef.current = { patientName, templateName, rapportResponses };
  });

  // Larger text / slower voice, remembered in this browser.
  // Keep the AI awake through the interview, so the analysis can start the moment it ends.
  useKeepAiAwake(state !== "finished");
  const comfort = useComfortSettings();
  const tts = useTTS({ rate: comfort.voiceRate });
  const ttsRef = useRef(tts);
  useEffect(() => {
    ttsRef.current = tts;
  });

  const setTurnPhase = (next: TurnPhase) => {
    phaseRef.current = next;
    setPhase(next);
  };

  const updateLanguage = (lang: ResponseLanguage) => {
    langRef.current = lang;
    setDetectedLang(lang);
    setLangDetected(true);
  };

  // ─── Live captions: every phrase the patient says, steering the turn ───
  const handlePhraseRef = useRef<(p: CaptionPhrase) => void>(() => {});
  const captions = useLiveCaptions(stream, {
    languageHint: langDetected ? detectedLang : undefined,
    onPhrase: (p) => handlePhraseRef.current(p),
  });
  const captionsRef = useRef(captions);
  useEffect(() => {
    captionsRef.current = captions;
  });

  // ─── Interview data ───
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    interviewLinksApi
      .getByToken(token)
      .then((res) => {
        if (cancelled) return;
        const link = res.data;
        const qs = link.questions || [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const questionTexts = qs.map((q: any) => (typeof q === "string" ? q : q.text));
        if (questionTexts.length > 0) {
          followUpsRef.current = followUpsOf(qs);
          sensitiveRef.current = sensitiveFlagsOf(qs);
          setQuestions(questionTexts);
          setPatientName(link.patient_name || "Client");
          setTemplateName(link.question_set_name || "Interview");
          nextAppointmentRef.current = link.next_appointment_at ?? null;
        } else {
          setQuestions(FALLBACK_QUESTIONS);
          setPatientName("Client");
          setTemplateName("Demo Template");
          setLinkValid(false);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setQuestions(FALLBACK_QUESTIONS);
        setPatientName("Client");
        setTemplateName("Demo Template");
        setLinkValid(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  // ─── Camera / mic ───
  const startMedia = useCallback(async () => {
    try {
      const media = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = media;
      setStream(media);
      if (videoRef.current) videoRef.current.srcObject = media;
      setCameraError("");
    } catch (err) {
      console.error("Media access error:", err);
      setCameraError("Camera or microphone access denied. Please allow access and reload.");
    }
  }, []);

  const stopMedia = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    startMedia();
    return () => {
      stopMedia();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [startMedia, stopMedia]);

  // Timer runs during the formal interview, but not during a break.
  useEffect(() => {
    if (state !== "recording" || onBreak) return;
    timerRef.current = setInterval(() => setElapsed((prev) => prev + 1), 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state, onBreak]);

  // From "Start Interview" until it's saved: warn before leaving, keep the screen on.
  const inConversation = state !== "idle" && state !== "finished";
  useLeaveWarning(inConversation);
  useScreenWakeLock(inConversation);
  // "Say hello" check on the start screen only (the captions take over after).
  const micCheck = useMicCheck(stream, state === "idle");
  // "I can't see your face" hints, on the patient's device, while they talk to Amumata.
  // The same sightings feed the head-down / blank-stare tracker used for check-ins.
  const faceHint = useFaceCheck(videoRef, inConversation && !onBreak && cameraOn, (sighting, usable) =>
    postureRef.current.feed(sighting, usable, Date.now()),
  );

  // Re-attach the stream when the video element remounts (idle → conversation),
  // only if not already bound — rebinding makes the preview flicker.
  useEffect(() => {
    if (streamRef.current && videoRef.current && videoRef.current.srcObject !== streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [state]);

  const toggleCamera = () => {
    const videoTrack = streamRef.current?.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !cameraOn;
      setCameraOn(!cameraOn);
    }
  };

  const toggleMic = () => {
    const audioTrack = streamRef.current?.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !micOn;
      setMicOn(!micOn);
    }
  };

  const micOnRef = useRef(micOn);
  useEffect(() => {
    micOnRef.current = micOn;
  });

  // The mic is muted while Amumata speaks so her voice is never captioned or
  // analysed as the patient's; it returns to the patient's own mute choice after.
  const setMicTrack = useCallback((enabled: boolean) => {
    const audioTrack = streamRef.current?.getAudioTracks()[0];
    if (audioTrack) audioTrack.enabled = enabled && micOnRef.current;
  }, []);

  const speakWithMicControl = useCallback(
    async (text: string, lang?: ResponseLanguage) => {
      setMicTrack(false);
      captionsRef.current.suspend(true);
      try {
        await ttsRef.current.speak(text, lang ? TTS_LOCALE[lang] : undefined);
      } finally {
        setMicTrack(true);
        captionsRef.current.suspend(false);
      }
    },
    [setMicTrack],
  );

  // ─── Media capture for analysis (unchanged behaviour) ───
  const captureFrame = useCallback((): Blob | null => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return null;
    // Shrink before saving: the face detector needs far less than full camera resolution.
    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;
    const scale = Math.min(1, FRAME_MAX_SIDE / Math.max(width, height));
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", FRAME_JPEG_QUALITY);
    const byteString = atob(dataUrl.split(",")[1]);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
    return new Blob([ab], { type: "image/jpeg" });
  }, []);

  const keepFrame = useCallback(
    (index: number) => {
      const frame = captureFrame();
      if (!frame) return;
      const existing = capturedFramesRef.current.get(index) || [];
      existing.push(frame);
      capturedFramesRef.current.set(index, existing);
    },
    [captureFrame],
  );

  const startAudioRecording = useCallback(() => {
    const audioTracks = streamRef.current?.getAudioTracks() ?? [];
    if (audioTracks.length === 0) return;
    const recorder = new MediaRecorder(new MediaStream(audioTracks), { mimeType: "audio/webm" });
    audioChunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunksRef.current.push(e.data);
    };
    recorder.start();
    mediaRecorderRef.current = recorder;
  }, []);

  const stopAudioRecording = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === "inactive") {
        resolve(null);
        return;
      }
      recorder.onstop = () => {
        if (audioChunksRef.current.length === 0) {
          resolve(null);
          return;
        }
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        audioChunksRef.current = [];
        resolve(blob);
      };
      recorder.stop();
      mediaRecorderRef.current = null;
    });
  }, []);

  const startFrameCapture = useCallback(() => {
    if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
    keepFrame(currentIndexRef.current);
    frameIntervalRef.current = setInterval(() => keepFrame(currentIndexRef.current), 3000);
  }, [keepFrame]);

  const stopFrameCapture = useCallback(() => {
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }
  }, []);

  useEffect(() => () => stopFrameCapture(), [stopFrameCapture]);

  // ─── Conversation building blocks ───

  /** No voice for the patient's language on this device: Amumata speaks English (the screen keeps their language). */
  const voiceFallsBack = (lang?: ResponseLanguage) => !!lang && lang !== "en" && !ttsRef.current.hasVoiceFor(TTS_LOCALE[lang]);

  /**
   * Amumata says something; the patient is not listened to meanwhile.
   * `english` is spoken instead of `text` when the device can't speak `lang`.
   */
  const say = async (text: string, lang?: ResponseLanguage, english?: string) => {
    setTurnPhase("speaking");
    if (english && voiceFallsBack(lang)) await speakWithMicControl(english, "en");
    else await speakWithMicControl(text, lang);
  };

  const sayLine = (line: ConversationLine) => {
    const lang = langRef.current;
    setSpokenLine(line);
    return say(CONVERSATION_LINES[line][lang], lang, CONVERSATION_LINES[line].en);
  };

  /** Amumata says a one-off line in the patient's language, shown on the prompt card. */
  const sayText = (text: string, english?: string) => {
    setSpokenLine(null);
    setAiPrompt({ kind: "text", main: text });
    return say(text, langRef.current, english);
  };

  /** Start a new turn: fresh captions and answer for the next prompt. */
  const newTurn = () => {
    captionsRef.current.newTurn();
    turnTextRef.current = [];
    answerBaseRef.current = 0;
    turnLangRef.current = "";
    confirmAskedAtRef.current = null;
    hardWordsAtRef.current = null;
    postureRef.current.resetClocks();
    setCheckInOpen(false);
  };

  const setCheckInOpen = (open: boolean) => {
    checkInOpenRef.current = open;
    setCheckInOpenState(open);
  };

  /** Record what the patient chose after a check-in on question `index`. */
  const markCheckIn = (index: number, outcome: CheckInOutcome) => {
    const checkIn = checkInsRef.current[index];
    if (checkIn) checkInsRef.current = { ...checkInsRef.current, [index]: { ...checkIn, outcome } };
  };

  /** Has the patient said anything since the current prompt? */
  const spokeSincePrompt = () =>
    captionsRef.current.getActivity().lastVoiceAt !== null || turnTextRef.current.length > answerBaseRef.current;

  /** Listen to the patient (again); silence is counted from now. */
  const listen = () => {
    listenSinceRef.current = Date.now();
    confirmAskedAtRef.current = null;
    setSpokenLine(null);
    setTurnPhase("listening");
    captionsRef.current.start();
  };

  /** Ask a check-in question, then wait for the reply. */
  const checkIn = async (line: ConversationLine) => {
    await sayLine(line);
    listenSinceRef.current = Date.now();
    confirmAskedAtRef.current = Date.now();
    // "Moving on…" notices get a visible countdown; questions wait for a reply.
    const isNotice = line === "confirmDone" || line === "confirmDoneLast";
    setMoveOnAt(isNotice ? confirmAskedAtRef.current + questionTiming(comfort.moreTime).confirmTimeoutMs : null);
    setTurnPhase("confirming");
  };

  /** Run one flow step at a time — ticks and phrases must not overlap. */
  const runFlow = async (step: () => Promise<void>) => {
    if (flowBusyRef.current) return;
    flowBusyRef.current = true;
    try {
      await step();
    } finally {
      flowBusyRef.current = false;
    }
  };

  /** For buttons: cut Amumata off, let the current step settle, then act. */
  const runNow = async (step: () => Promise<void>) => {
    ttsRef.current.stop();
    const started = Date.now();
    while (flowBusyRef.current && Date.now() - started < 15000) {
      await new Promise((resolve) => setTimeout(resolve, 50));
      ttsRef.current.stop();
    }
    await runFlow(step);
  };

  // ─── Warm-up (rapport) ───

  const questionText = (q: LocalizedLine, lang: ResponseLanguage) => (lang === "en" ? q.en : q[lang]);

  const askRapport = async (index: number) => {
    rapportIndexRef.current = index;
    setState("rapport_wait");
    newTurn();
    const lang = langRef.current;
    setSpokenLine(null);
    setAiPrompt({ kind: "localized", line: RAPPORT_QUESTIONS[index], primary: "all" });
    await say(questionText(RAPPORT_QUESTIONS[index], lang), lang, RAPPORT_QUESTIONS[index].en);
    listen();
  };

  const askPermission = async () => {
    setState("permission_wait");
    newTurn();
    nudgedRef.current = false;
    const lang = langRef.current;
    setSpokenLine(null);
    // Once, before starting: no right or wrong answers, only the therapist sees this, skip or rest anytime.
    setAiPrompt({ kind: "localized", line: REASSURANCE_LINE, primary: "all" });
    await say(REASSURANCE_LINE[lang], lang, REASSURANCE_LINE.en);
    setAiPrompt({ kind: "localized", line: PERMISSION_LINES, primary: "all" });
    await say(PERMISSION_LINES[lang], lang, PERMISSION_LINES.en);
    listen();
  };

  const submitRapport = async (answer: string) => {
    const index = rapportIndexRef.current;
    let lang = langRef.current;
    if (answer) {
      lang = detectResponseLanguage(answer, turnLangRef.current);
      updateLanguage(lang);
      // Language known: translate the questions now, while the warm-up continues.
      prefetchTranslations(lang);
    }
    const category = detectRapportCategory(answer);
    const acknowledgment = pickAcknowledgment(category, lang, index);
    setRapportResponses((prev) => [
      ...prev,
      { question: questionText(RAPPORT_QUESTIONS[index], lang), answer: answer || "(no answer)", acknowledgment },
    ]);
    setTypedAnswer("");
    setState("rapport_chat");
    newTurn();
    setSpokenLine(null);
    setAiPrompt({ kind: "text", main: acknowledgment });
    await say(acknowledgment, lang, pickAcknowledgment(category, "en", index));
    if (index < RAPPORT_QUESTIONS.length - 1) await askRapport(index + 1);
    else await askPermission();
  };

  const startConversation = () => {
    // This click unlocks audio playback and the mic analyser in the browser,
    // so captions start here (the mic stays muted while Amumata speaks).
    setState("rapport_intro");
    captionsRef.current.start();
    void runFlow(async () => {
      newTurn();
      const name = sessionInfoRef.current.patientName;
      const intro: LocalizedLine = {
        en: fillName(INTRO_LINES.en, name),
        tl: fillName(INTRO_LINES.tl, name),
        ceb: fillName(INTRO_LINES.ceb, name),
      };
      setAiPrompt({ kind: "localized", line: intro, primary: "all" });
      await say(intro.en);
      await askRapport(0);
    });
  };

  // ─── Formal interview ───

  /** Translation of a question, started once and shared (null = use English). */
  const translationFor = (original: string, lang: QuestionLanguage): Promise<string | null> => {
    const key = `${lang}|${original}`;
    let pending = questionTransCacheRef.current.get(key);
    if (!pending) {
      // Queue behind earlier translations: the local AI handles one at a time.
      pending = translationQueueRef.current
        .then(() => translateQuestion(original, lang))
        .catch(() => null)
        .then((text) => {
          // A failed translation is retried the next time it's needed.
          if (!text) questionTransCacheRef.current.delete(key);
          return text;
        });
      translationQueueRef.current = pending;
      questionTransCacheRef.current.set(key, pending);
    }
    return pending;
  };

  /**
   * Translate every question in the background as soon as the patient's
   * language is known, so each one is ready before it's asked.
   */
  const prefetchTranslations = (lang: ResponseLanguage) => {
    if (lang === "en") return;
    questionsRef.current.forEach((q) => void translationFor(q, lang));
    followUpsRef.current.forEach((f) => f && void translationFor(f, lang));
  };

  /** A question (or follow-up) in the patient's language (via the AI translator), English underneath. */
  const prepareText = async (original: string) => {
    const lang = langRef.current;
    if (lang === "en") return { main: original, speak: original, speakLang: undefined };
    // Never keep the patient waiting on the translator: if it isn't ready
    // shortly, ask in English.
    const translated = await Promise.race([
      translationFor(original, lang),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), TRANSLATION_WAIT_MS)),
    ]);
    return translated
      ? { main: translated, sub: original, speak: translated, speakLang: lang }
      : { main: original, speak: original, speakLang: undefined };
  };

  const askFormal = async (index: number, fresh = true) => {
    currentIndexRef.current = index;
    setCurrentIndex(index);
    if (fresh) newTurn();
    setTurnPhase("preparing");
    const q = await prepareText(questionsRef.current[index]);
    // A question the therapist marked sensitive gets a soft line first (once, not on "repeat").
    if (fresh && sensitiveRef.current[index]) {
      const lang = langRef.current;
      setSpokenLine(null);
      setAiPrompt({ kind: "localized", line: SENSITIVE_INTRO, primary: "all" });
      await say(SENSITIVE_INTRO[lang], lang, SENSITIVE_INTRO.en);
    }
    setSpokenLine(null);
    setAiPrompt({ kind: "text", main: q.main, sub: q.sub });
    // The question as the therapist wrote it is the fallback when the translation can't be voiced.
    await say(q.speak, q.speakLang, questionsRef.current[index]);
    listen();
  };

  /**
   * "Are you okay to continue?" — when the patient seems to struggle with
   * question `index`. Their choice (continue / break / skip) is recorded for the therapist.
   */
  const offerCheckIn = async (index: number, reason: CheckInReason) => {
    checkInsRef.current = { ...checkInsRef.current, [index]: { reason, outcome: "continued" } };
    hardWordsAtRef.current = null;
    setCheckInOpen(true);
    const lang = langRef.current;
    setSpokenLine(null);
    setAiPrompt({ kind: "localized", line: CHECK_IN_LINE, primary: "all" });
    await say(CHECK_IN_LINE[lang], lang, CHECK_IN_LINE.en);
    listen();
  };

  /** "I'm okay": the same question carries on. */
  const continueAfterCheckIn = async () => {
    setCheckInOpen(false);
    const lang = langRef.current;
    setSpokenLine(null);
    setAiPrompt({ kind: "localized", line: CHECK_IN_OKAY, primary: "all" });
    await say(CHECK_IN_OKAY[lang], lang, CHECK_IN_OKAY.en);
    listen();
  };

  /**
   * The therapist's follow-up after a short answer. It belongs to the same
   * question: the recording keeps going and the reply is added to the answer.
   */
  const askFollowUp = async (index: number) => {
    const followUp = followUpsRef.current[index];
    if (!followUp) return;
    followUpAskedRef.current.add(index);
    captionsRef.current.newTurn(); // fresh captions and silence clock for the reply
    answerBaseRef.current = turnTextRef.current.length;
    confirmAskedAtRef.current = null;
    setTurnPhase("preparing");
    const q = await prepareText(followUp);
    setSpokenLine(null);
    setAiPrompt({ kind: "text", main: q.main, sub: q.sub });
    await say(q.speak, q.speakLang, followUp);
    listen();
  };

  /** Save where the patient is, so a refresh can continue from question `nextIndex`. */
  const persistProgress = (nextIndex: number) => {
    if (!token) return;
    saveProgress(token, {
      nextIndex,
      answers: Object.fromEntries(answersRef.current),
      lang: langRef.current,
      elapsed: elapsedRef.current,
      rapportResponses: sessionInfoRef.current.rapportResponses,
      crisis: crisisRaisedRef.current,
      moodBefore: moodRef.current.mood_before,
      feelings: feelingsRef.current,
      checkIns: checkInsRef.current,
      skipped: [...skippedRef.current],
      savedAt: Date.now(),
    });
  };

  /** Keep an answer's recordings in the browser right away (queued, so saves never overlap). */
  const saveAnswerFiles = (files: File[]) => {
    if (token && files.length > 0) {
      fileSaveQueueRef.current = fileSaveQueueRef.current
        .then(() => addFiles(token, files.map((f) => ({ name: f.name, type: f.type, blob: f }))))
        .catch(() => {
          fileSaveFailedRef.current = true; // fall back to saving everything at the end
        });
    }
    return fileSaveQueueRef.current;
  };

  const startFormal = async () => {
    ttsRef.current.stop();
    setState("recording");
    setElapsed(0);
    answersRef.current.clear();
    followUpAskedRef.current.clear();
    feelingsRef.current = {};
    setFeelings({});
    checkInsRef.current = {};
    skippedRef.current = new Set();
    capturedFramesRef.current.clear();
    capturedAudioRef.current.clear();
    if (token) {
      clearStagedNames(token);
      fileSaveQueueRef.current = deleteFiles(token).catch(() => {});
    }
    currentIndexRef.current = 0;
    persistProgress(0);
    startAudioRecording();
    startFrameCapture();
    await askFormal(0);
  };

  /**
   * "How are you feeling right now?" — waits for a tapped face (or Skip).
   * Asked outside the recordings, so it is never part of an answer.
   */
  const askMood = async (moment: MoodMoment) => {
    setState(moment === "before" ? "mood_before" : "mood_after");
    const lang = langRef.current;
    const chosen = new Promise<number | null>((resolve) => {
      moodResolveRef.current = resolve;
    });
    setSpokenLine(null);
    setAiPrompt({ kind: "localized", line: MOOD_QUESTIONS[moment], primary: "all" });
    await say(MOOD_QUESTIONS[moment][lang], lang, MOOD_QUESTIONS[moment].en);
    setTurnPhase("listening");
    const mood = await chosen;
    moodRef.current = { ...moodRef.current, [moment === "before" ? "mood_before" : "mood_after"]: mood };
  };

  const chooseMood = (mood: number | null) => {
    ttsRef.current.stop();
    moodResolveRef.current?.(mood);
    moodResolveRef.current = null;
  };

  /** "Ready" → the mood check, then the first question. */
  const beginInterview = async () => {
    moodRef.current = { mood_before: null, mood_after: null };
    await askMood("before");
    await startFormal();
  };

  /** After a refresh: skip the warm-up and re-ask the question that was interrupted. */
  const resumeInterview = () => {
    const p = savedProgress;
    if (!p || !token) return;
    setSavedProgress(null);
    answersRef.current = new Map(Object.entries(p.answers).map(([i, answer]) => [Number(i), answer]));
    updateLanguage(p.lang);
    prefetchTranslations(p.lang);
    setRapportResponses(p.rapportResponses);
    moodRef.current = { mood_before: p.moodBefore ?? null, mood_after: null };
    feelingsRef.current = p.feelings ?? {};
    checkInsRef.current = p.checkIns ?? {};
    skippedRef.current = new Set(p.skipped ?? []);
    setFeelings(feelingsRef.current);
    setElapsed(p.elapsed);
    elapsedRef.current = p.elapsed;
    currentIndexRef.current = p.nextIndex;
    if (p.crisis) {
      // Keep the help card; the server already has (or now gets) the one alert.
      crisisRaisedRef.current = true;
      setCrisis({ notified: false });
      void emotionApi.reportCrisis(token).then((notified) => notified && setCrisis({ notified: true }));
    }
    setState("recording");
    captionsRef.current.start(); // this click also unlocks audio, as on a fresh start
    startAudioRecording();
    startFrameCapture();
    void runFlow(async () => {
      newTurn();
      await sayLine("resumeWelcome");
      await askFormal(p.nextIndex, false);
    });
  };

  const startOver = () => {
    if (!token) return;
    if (!window.confirm("Start the interview again from the beginning? Your earlier answers will be discarded.")) return;
    clearProgress(token);
    clearStagedNames(token);
    void deleteFiles(token).catch(() => {});
    setSavedProgress(null);
  };

  /** One answer's recordings, named the way the analysis expects. */
  const filesForQuestion = (index: number): File[] => [
    ...(capturedFramesRef.current.get(index) ?? []).map(
      (blob, frameIdx) => new File([blob], `frame_${index}_${frameIdx}.jpg`, { type: "image/jpeg" }),
    ),
    ...[capturedAudioRef.current.get(index)]
      .filter((blob): blob is Blob => Boolean(blob))
      .map((blob) => new File([blob], `audio_${index}.webm`, { type: "audio/webm" })),
  ];

  /**
   * Early upload: send a finished answer while the patient answers the next
   * one, so the final upload is tiny. Best effort — anything that didn't make
   * it is uploaded from the browser's copy at the end.
   */
  const uploadAnswerEarly = (index: number) => {
    if (!token) return;
    const files = filesForQuestion(index);
    if (files.length === 0) return;
    emotionApi.stageFiles(token, files).then(
      () => addStagedNames(token, files.map((f) => f.name)),
      () => {},
    );
  };

  const finishInterview = async () => {
    if (!token || stateRef.current === "finished") return;
    const index = currentIndexRef.current;
    setState("finished");
    ttsRef.current.stop();
    captionsRef.current.stop();
    stopFrameCapture();

    // Still recording (ended early)? Close that answer. After the closing mood check it's already closed.
    const stillRecording = mediaRecorderRef.current !== null;
    const lastAudio = await stopAudioRecording();
    if (lastAudio) capturedAudioRef.current.set(index, lastAudio);
    if (stillRecording) keepFrame(index);
    stopMedia();

    const qs = questionsRef.current;
    const answered = Math.min(qs.length, index + 1);
    const finalResponses = qs.slice(0, answered).map((question, i) => ({
      question,
      answer: answersRef.current.get(i) || "[Audio response recorded]",
    }));

    const files = Array.from({ length: answered }, (_, i) => filesForQuestion(i)).flat();

    // Interview metadata (rapport is NOT part of the formal data).
    const info = sessionInfoRef.current;
    sessionStorage.setItem(
      `amumata_result_${token}`,
      JSON.stringify({
        token,
        patientName: info.patientName,
        templateName: info.templateName,
        questions: qs,
        responses: finalResponses,
        duration: elapsedRef.current,
        completedAt: new Date().toISOString(),
        selfReport: moodRef.current,
        nextAppointmentAt: nextAppointmentRef.current,
        followUpsAsked: [...followUpAskedRef.current],
        feelingsTapped: feelingsRef.current,
        checkIns: checkInsRef.current,
        skipped: [...skippedRef.current],
      }),
    );
    if (info.rapportResponses.length > 0) {
      sessionStorage.setItem(`amumata_rapport_${token}`, JSON.stringify(info.rapportResponses));
    }

    // Earlier answers were saved one by one; add the last. If the browser store
    // failed along the way, save everything still in memory instead.
    await saveAnswerFiles(filesForQuestion(index));
    if (fileSaveFailedRef.current) {
      await storeFiles(token, files.map((file) => ({ name: file.name, type: file.type, blob: file }))).catch(() => {});
    }
    clearProgress(token);
    navigate(`/interview/${token}/processing`);
  };

  /** Close the current answer and ask the next question (or finish). */
  const proceedFormal = async () => {
    const index = currentIndexRef.current;
    setTurnPhase("busy");
    ttsRef.current.stop();
    const answer = turnTextRef.current.join(" ").trim();
    answersRef.current.set(index, answer);
    const answered = Boolean(answer) || captionsRef.current.getActivity().lastVoiceAt !== null;
    // Moved on without saying anything: skipped, so it's left out of the AI results.
    if (!answered) {
      skippedRef.current.add(index);
      markCheckIn(index, "skipped");
    }
    setCheckInOpen(false);

    if (index >= questionsRef.current.length - 1) {
      // Close the last answer's recording before the mood check, so the check isn't part of it.
      stopFrameCapture();
      keepFrame(index);
      const audio = await stopAudioRecording();
      if (audio) capturedAudioRef.current.set(index, audio);
      await askMood("after");
      const name = sessionInfoRef.current.patientName;
      const nextAt = nextAppointmentRef.current;
      await sayText(closingLine(name, langRef.current, nextAt), closingLine(name, "en", nextAt));
      await finishInterview();
      return;
    }
    stopFrameCapture();
    keepFrame(index);
    const audio = await stopAudioRecording();
    if (audio) capturedAudioRef.current.set(index, audio);
    uploadAnswerEarly(index);
    void saveAnswerFiles(filesForQuestion(index));
    persistProgress(index + 1);

    // A short thank-you (or "halfway there") before the next question.
    const turnInfo = { answeredIndex: index, total: questionsRef.current.length, answered };
    const transition = transitionLine({ ...turnInfo, lang: langRef.current });
    if (transition) await sayText(transition, transitionLine({ ...turnInfo, lang: "en" }) ?? undefined);

    currentIndexRef.current = index + 1;
    startAudioRecording();
    startFrameCapture();
    await askFormal(index + 1);
  };

  const repeatQuestion = async () => {
    await askFormal(currentIndexRef.current, false);
  };

  const setBreak = (on: boolean) => {
    onBreakRef.current = on;
    setOnBreak(on);
  };

  /** Pause the answer: nothing is recorded, timed or moved on until "ready". */
  const startBreak = async () => {
    if (checkInOpenRef.current) {
      markCheckIn(currentIndexRef.current, "break");
      setCheckInOpen(false);
    }
    setBreak(true);
    setMoveOnAt(null);
    stopFrameCapture();
    if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.pause();
    await sayLine("breakStart");
    listen(); // keep listening, only for "ready"
  };

  /** Back from the break: same answer continues, the question is asked again. */
  const endBreak = async () => {
    setBreak(false);
    if (mediaRecorderRef.current?.state === "paused") mediaRecorderRef.current.resume();
    startFrameCapture();
    await sayLine("breakEnd");
    await askFormal(currentIndexRef.current, false);
  };

  /** Show the help card and alert the therapist the first time crisis words appear. */
  const checkForCrisis = (text: string) => {
    if (crisisRaisedRef.current || !detectCrisis(text)) return;
    crisisRaisedRef.current = true;
    setCrisis({ notified: false });
    if (stateRef.current === "recording") persistProgress(currentIndexRef.current); // card survives a refresh
    if (token) void emotionApi.reportCrisis(token).then((notified) => notified && setCrisis({ notified: true }));
  };

  // ─── What the patient says steers the conversation ───
  const handlePhrase = (p: CaptionPhrase) => {
    // Every word counts for safety, whatever the turn or a break.
    const sameTurn = p.turn === captionsRef.current.getTurn();
    checkForCrisis(sameTurn ? [...turnTextRef.current, p.text].join(" ") : p.text);
    // Late phrases from an earlier prompt don't belong to this one.
    if (!sameTurn) return;
    const current = stateRef.current;
    const confirming = phaseRef.current === "confirming";
    const parsed = parseVoiceCommand(p.text);
    // On a break only "ready" counts; what's said meanwhile isn't part of the answer.
    if (onBreakRef.current) {
      if (parsed === "yes") void runFlow(endBreak);
      return;
    }
    // Reply to "Are you okay to continue?": "oo / okay" → carry on, "no / pahulay" → a break,
    // "sunod / tapos na" → skip (handled below as "next"); anything else is their answer.
    if (current === "recording" && checkInOpenRef.current && !isExplicitDone(p.text)) {
      if (parsed === "yes") {
        void runFlow(continueAfterCheckIn);
        return;
      }
      if (parsed === "no" || parsed === "pause") {
        void runNow(startBreak);
        return;
      }
      setCheckInOpen(false);
    }
    // A short "I don't know / ambot / lisod isulti" may mean the question is hard to answer.
    if (current === "recording" && soundsHardToAnswer(p.text)) hardWordsAtRef.current = Date.now();
    // While answering, "oo" / "okay lang" / "hindi" are real answers, not
    // commands — only "repeat" and an explicit "I'm done / next / tapos na"
    // act. Casual yes / no count once Amumata has asked "are you done?".
    // In the warm-up every reply is an answer ("okay lang" to "how are you?").
    let command: typeof parsed = null;
    if (parsed === "repeat") command = "repeat";
    else if (parsed === "pause" && current === "recording") command = "pause";
    else if (current === "permission_wait") command = parsed;
    else if (current === "recording") command = confirming ? parsed : isExplicitDone(p.text) ? "yes" : null;
    const isAnswer = !command;
    if (isAnswer) {
      turnTextRef.current.push(p.text);
      if (!turnLangRef.current) turnLangRef.current = p.language;
    }

    if (current === "permission_wait") {
      if (command === "yes") void runFlow(beginInterview);
      else if (command === "no") void runFlow(async () => {
        await sayLine("notReady");
        listen();
      });
      return;
    }

    if (current === "rapport_wait") {
      if (command === "repeat") void runFlow(() => askRapport(rapportIndexRef.current));
      // Speech after a nudge is the answer — keep listening for it to finish.
      else if (phaseRef.current === "confirming") listen();
      return;
    }

    if (current !== "recording") return;
    if (command === "pause") {
      void runNow(startBreak);
    } else if (command === "repeat") {
      void runFlow(repeatQuestion);
    } else if (command === "yes") {
      // "Yes" to the check-in, or an explicit "I'm done / next" while answering.
      void runFlow(proceedFormal);
    } else if (command === "no") {
      // "Not yet / wait" to the check-in.
      void runFlow(async () => {
        await sayLine("keepGoing");
        listen();
      });
    } else if (confirming) {
      // They kept talking instead of answering the check-in: it's more answer.
      listen();
    }
  };

  // ─── Hands-free: check in after long silences, move on when confirmed ───
  // The interval always runs the latest tick (refreshed after every render).
  const tickRef = useRef<() => void>(() => {});
  useEffect(() => {
    const interval = setInterval(() => tickRef.current(), TICK_MS);
    return () => clearInterval(interval);
  }, []);

  const tick = () => {
      const current = stateRef.current;
      if (flowBusyRef.current || onBreakRef.current) return;
      if (current !== "recording" && current !== "rapport_wait" && current !== "permission_wait") return;
      const turnPhase = phaseRef.current;
      if (turnPhase !== "listening" && turnPhase !== "confirming") return;

      const activity = captionsRef.current.getActivity();
      const lastVoice = activity.lastVoiceAt ?? 0;
      const now = Date.now();

      // Struggling with a question? A gentle check-in — also with hands-free off,
      // since it never moves on by itself. Not once the crisis card is up (it has its own message).
      if (current === "recording" && turnPhase === "listening" && !checkInOpenRef.current && !crisisRaisedRef.current) {
        const index = currentIndexRef.current;
        const reason = decideCheckIn({
          now,
          silenceSince: Math.max(listenSinceRef.current, lastVoice),
          hasAnswer: spokeSincePrompt(),
          voiceActive: activity.voiceActive,
          pendingTranscripts: activity.pending,
          hardWordsAt: hardWordsAtRef.current,
          posture: cameraOn ? postureRef.current.read() : { headDownMs: 0, stillMs: 0 },
          sensitive: Boolean(sensitiveRef.current[index]),
          askedThisQuestion: index in checkInsRef.current,
          checkInsSoFar: Object.keys(checkInsRef.current).length,
        });
        if (reason) {
          void runFlow(() => offerCheckIn(index, reason));
          return;
        }
      }
      if (!handsFreeRef.current) return;

      if (current === "permission_wait") {
        // Starting the interview always needs an explicit "yes" — only remind.
        if (!nudgedRef.current && !activity.voiceActive && now - Math.max(listenSinceRef.current, lastVoice) >= 25000) {
          nudgedRef.current = true;
          void runFlow(async () => {
            await sayLine("readyNudge");
            listen();
          });
        }
        return;
      }

      const action = decideTurn(
        {
          now,
          silenceSince: Math.max(listenSinceRef.current, lastVoice),
          hasAnswer: spokeSincePrompt(),
          voiceActive: activity.voiceActive,
          pendingTranscripts: activity.pending,
          confirmAskedAt: confirmAskedAtRef.current,
        },
        current === "recording" ? questionTiming(comfort.moreTime) : WARMUP_TIMING,
      );
      if (action === "wait") return;

      if (current === "rapport_wait") {
        if (action === "proceed") void runFlow(() => submitRapport(turnTextRef.current.join(" ").trim()));
        else if (action === "ask_confirm") void runFlow(() => checkIn("warmupNudge"));
        else void runFlow(() => submitRapport(""));
        return;
      }

      // Formal question.
      if (action === "ask_confirm") {
        const answered = spokeSincePrompt();
        const index = currentIndexRef.current;
        // A short answer gets the therapist's follow-up (once) instead of "moving on".
        const followUp = shouldAskFollowUp({
          followUp: followUpsRef.current[index],
          alreadyAsked: followUpAskedRef.current.has(index),
          answer: turnTextRef.current.join(" "),
        });
        if (answered && followUp) {
          void runFlow(() => askFollowUp(index));
          return;
        }
        const isLast = index >= questionsRef.current.length - 1;
        // From here a "yes" means "move on", not "I'm okay to continue".
        setCheckInOpen(false);
        void runFlow(() => checkIn(!answered ? "confirmSilent" : isLast ? "confirmDoneLast" : "confirmDone"));
      } else if (action === "auto_proceed") {
        const answered = spokeSincePrompt();
        void runFlow(async () => {
          // After an answer the notice already said "moving on" — don't repeat it.
          if (!answered) await sayLine("movingOn");
          await proceedFormal();
        });
      }
  };

  useEffect(() => {
    handlePhraseRef.current = handlePhrase;
    tickRef.current = tick;
  });

  // ─── Optional buttons (same actions as the voice commands) ───
  /**
   * A feeling word tapped for the current question. Tapping counts as taking
   * part: the silence clock restarts, and a "moving on" countdown is called off.
   */
  const handleFeelingToggle = (key: string) => {
    const index = currentIndexRef.current;
    const next = { ...feelingsRef.current, [index]: toggleFeeling(feelingsRef.current[index] ?? [], key) };
    feelingsRef.current = next;
    setFeelings(next);
    if (phaseRef.current === "confirming") {
      setMoveOnAt(null);
      listen();
    } else {
      listenSinceRef.current = Date.now();
    }
  };

  const handleNextButton = () => void runNow(proceedFormal);
  const handleCheckInContinue = () => void runNow(continueAfterCheckIn);
  const handleRepeatButton = () => void runNow(repeatQuestion);
  const handleKeepTalking = () => void runNow(async () => listen());
  const handleBreakButton = () => void runNow(startBreak);
  const handleResumeButton = () => void runNow(endBreak);
  const handleStartButton = () => void runNow(beginInterview);
  const handleSkipWarmup = () => void runNow(askPermission);
  const handleTypedAnswer = () => {
    const text = typedAnswer.trim();
    if (!text) return;
    checkForCrisis(text);
    void runNow(() => submitRapport(text));
  };
  const handleEnd = () => {
    if (window.confirm("End the interview now? Your answers so far will be saved.")) void finishInterview();
  };

  // ─── Idle screen (one click to begin — browsers require it for audio) ───
  // Progress from before a refresh, if it still fits this interview's questions.
  const resumable = savedProgress !== null && questions.length > 0 && savedProgress.nextIndex < questions.length;
  if (state === "idle") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F1F5F9] px-4">
        <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-6 shadow-md md:p-8">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-slate-900">Interview Room</h1>
            <p className="mt-1 text-sm text-slate-500">
              {templateName} — {questions.length} questions
            </p>
          </div>

          <div className="mb-6 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-6">
            <div className="relative mx-auto w-full max-w-md overflow-hidden rounded-xl bg-slate-900">
              <video ref={videoRef} autoPlay playsInline muted className="aspect-video w-full object-cover" />
              {!cameraOn && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80">
                  <VideoOff size={48} className="text-slate-400" />
                </div>
              )}
            </div>
            {cameraError && <p className="mt-3 text-center text-sm text-red-500">{cameraError}</p>}
          </div>

          <div className="mb-4 flex items-center justify-center gap-4">
            <button
              onClick={toggleCamera}
              className={`rounded-full p-3 transition ${cameraOn ? "bg-slate-100 text-slate-700" : "bg-red-100 text-red-600"}`}
              title={cameraOn ? "Turn off camera" : "Turn on camera"}
            >
              {cameraOn ? <Video size={20} /> : <VideoOff size={20} />}
            </button>
            <button
              onClick={toggleMic}
              className={`rounded-full p-3 transition ${micOn ? "bg-slate-100 text-slate-700" : "bg-red-100 text-red-600"}`}
              title={micOn ? "Mute" : "Unmute"}
            >
              {micOn ? <Mic size={20} /> : <MicOff size={20} />}
            </button>
          </div>

          {!cameraError && <MicCheckPanel status={micCheck.status} getLevel={micCheck.getLevel} micOn={micOn} />}

          <div className="mb-6 flex flex-wrap items-center justify-center gap-2">
            <span className="text-sm text-slate-500">Comfort options:</span>
            <ComfortToggles
              variant="light"
              largeText={comfort.largeText}
              slowVoice={comfort.slowVoice}
              onToggleLargeText={comfort.toggleLargeText}
              onToggleSlowVoice={comfort.toggleSlowVoice}
              moreTime={comfort.moreTime}
              onToggleMoreTime={comfort.toggleMoreTime}
            />
          </div>

          <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4">
            <h3 className="mb-2 text-sm font-semibold text-blue-900">Before You Begin</h3>
            <ul className="space-y-1.5 text-sm text-blue-800">
              {[
                "This is a voice conversation — Amumata asks, you answer out loud. No clicking needed.",
                "Speak in English, Tagalog, Bisaya, or a mix — whatever feels natural.",
                "When you finish an answer, Amumata will ask if you're done. Just say “yes”, or keep talking.",
                "Sit in a well-lit area facing the light, with your full face in the camera frame.",
                "Express yourself freely — this is a safe space. Your video is only reviewed by your therapist.",
              ].map((tip) => (
                <li key={tip} className="flex items-start gap-2">
                  <span className="mt-0.5 text-blue-500">•</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>

          {!linkValid && (
            <p className="mb-4 text-center text-sm text-yellow-600">Interview link not recognized. Using demo questions.</p>
          )}
          {captions.engine === "whisper" && (
            <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-center text-sm text-amber-800">
              This browser doesn't support live word-by-word captions. For the best experience, open this link in
              Microsoft Edge or Google Chrome.
            </p>
          )}

          {resumable ? (
            <div className="rounded-xl border border-teal-200 bg-teal-50 p-4 text-center">
              <p className="font-semibold text-teal-900">Welcome back{patientName ? `, ${patientName}` : ""}.</p>
              <p className="mt-1 text-sm text-teal-800">
                You've answered {savedProgress.nextIndex} of {questions.length} questions. Your answers so far are saved.
              </p>
              <button
                onClick={resumeInterview}
                disabled={!!cameraError}
                className="mt-3 w-full rounded-lg bg-teal-600 py-3 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-50"
              >
                Continue from question {savedProgress.nextIndex + 1}
              </button>
              <button onClick={startOver} className="mt-2 text-sm text-slate-500 underline-offset-2 hover:underline">
                Start over
              </button>
            </div>
          ) : (
            <button
              onClick={startConversation}
              disabled={!!cameraError}
              className="w-full rounded-lg bg-teal-600 py-3 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-50"
            >
              Start Interview
            </button>
          )}
        </div>
      </div>
    );
  }

  // ─── Finished screen ───
  if (state === "finished") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F1F5F9] px-4">
        <div className="w-full max-w-xl rounded-xl border border-slate-200 bg-white p-8 text-center shadow-md">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <Check className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Interview Complete</h1>
          <p className="mt-2 text-slate-500">Thank you, {patientName}. Your responses have been recorded.</p>
          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            <p>Questions answered: {Math.min(questions.length, currentIndex + 1)}</p>
            <p>Duration: {formatTime(elapsed)}</p>
          </div>
          <p className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-500">
            <Loader2 size={16} className="animate-spin" /> Saving your interview…
          </p>
          <p className="mt-4 text-xs text-slate-400">
            Your therapist will review the results. This system does not provide a clinical diagnosis.
          </p>
        </div>
      </div>
    );
  }

  // ─── Conversation screen: face on the left, conversation on the right ───
  const isFormal = state === "recording";
  const moodCheck = state === "mood_before" || state === "mood_after";
  const listening = phase === "listening" || phase === "confirming";
  const working = phase === "busy" || phase === "preparing";
  const statusLabel = onBreak && phase !== "speaking"
    ? "On a break"
    : phase === "speaking"
      ? "Amumata is speaking"
      : phase === "busy"
        ? "Saving your answer…"
        : phase === "preparing"
          ? "Preparing the next question…"
          : phase === "confirming"
            ? "Waiting for your reply"
            : captions.voiceActive
              ? "Hearing you…"
              : "Listening";
  const statusColor =
    phase === "speaking"
      ? "bg-teal-500"
      : working || onBreak
        ? "bg-slate-400"
        : phase === "confirming"
          ? "bg-amber-400"
          : "bg-red-500";
  const presenceMood: PresenceMood = onBreak
    ? "resting"
    : phase === "speaking"
      ? "speaking"
      : working
        ? "thinking"
        : "listening";
  const presenceLabel = {
    resting: "Take all the time you need",
    speaking: "Amumata is speaking",
    thinking: "One moment…",
    listening: moodCheck ? "Tap the face that fits" : captions.voiceActive ? "I'm listening" : "Go ahead — I'm listening",
  }[presenceMood];
  const isLastQuestion = currentIndex >= questions.length - 1;
  // Speaking English because this device has no voice for the patient's language.
  const voiceIsEnglish = langDetected && detectedLang !== "en" && !tts.hasVoiceFor(TTS_LOCALE[detectedLang]);
  const roundBtn =
    "flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:opacity-40";

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-slate-950 text-white lg:flex-row">
      <canvas ref={canvasRef} className="hidden" />

      {/* Left: Amumata, with the patient's own video small in the corner */}
      <section className="relative h-[40dvh] shrink-0 overflow-hidden bg-linear-to-b from-slate-900 via-slate-900 to-teal-950/60 lg:h-full lg:w-1/2">
        <div className="flex h-full items-center justify-center pb-6">
          <AmumataPresence mood={presenceMood} label={presenceLabel} getLevel={captions.getLevel} />
        </div>
        {/* Self-view. Hiding it only covers the preview: the camera keeps recording for the therapist. */}
        <div className="absolute bottom-3 right-3 flex flex-col items-end gap-1.5">
          <div
            className={`relative aspect-4/3 w-24 overflow-hidden rounded-xl border border-white/15 bg-black shadow-lg sm:w-32 lg:w-44 ${comfort.hideSelfView ? "pointer-events-none absolute bottom-0 right-0 opacity-0" : ""}`}
            aria-hidden={comfort.hideSelfView}
          >
            <video ref={videoRef} autoPlay playsInline muted className="h-full w-full -scale-x-100 object-cover" />
            {!cameraOn && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
                <VideoOff size={24} className="text-slate-600" />
              </div>
            )}
          </div>
          <button
            onClick={comfort.toggleSelfView}
            className="flex items-center gap-1 rounded-full bg-black/50 px-2.5 py-1 text-[11px] text-slate-200 backdrop-blur-sm hover:bg-black/70"
            title={comfort.hideSelfView ? "Show your video again" : "Hide your own video — Amumata still records for your therapist"}
          >
            {comfort.hideSelfView ? <Eye size={12} /> : <EyeOff size={12} />}
            {comfort.hideSelfView ? "Show my video" : "Hide my video"}
          </button>
        </div>
        <div className="absolute left-3 top-3 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500 text-sm font-bold shadow-lg">A</div>
          <span className="text-sm font-semibold drop-shadow-lg">Amumata</span>
        </div>
        {/* Honest but calm: it says it's recording, without a red light or a running clock. */}
        {isFormal && (
          <div
            className="absolute right-3 top-3 flex items-center gap-2 rounded-full bg-black/40 px-3 py-1.5 backdrop-blur-sm"
            title={`Interview time: ${formatTime(elapsed)}`}
          >
            <span className="h-2 w-2 rounded-full bg-teal-400" />
            <span className="text-xs font-medium text-slate-200">{onBreak ? "Paused" : "Recording for your therapist"}</span>
          </div>
        )}
        {/* Not during a check-in: "I can't see your face" would be unkind to someone looking down. */}
        {((faceHint && !checkInOpen) || !cameraOn) && (
          <p
            role="status"
            className="absolute inset-x-3 top-14 mx-auto flex max-w-md items-center justify-center gap-2 rounded-xl bg-amber-500/90 px-3 py-2 text-center text-sm font-medium text-slate-950 shadow-lg"
          >
            <ScanFace size={16} className="shrink-0" />
            {FACE_HINTS[cameraOn && faceHint ? faceHint : "camera_off"][detectedLang]}
          </p>
        )}
        <div className="absolute bottom-3 left-3 flex gap-2">
          <button
            onClick={toggleCamera}
            className={`rounded-full p-2.5 backdrop-blur-sm transition ${cameraOn ? "bg-black/50 hover:bg-black/70" : "bg-red-600/90"}`}
            title={cameraOn ? "Turn off camera" : "Turn on camera"}
          >
            {cameraOn ? <Video size={18} /> : <VideoOff size={18} />}
          </button>
          <button
            onClick={toggleMic}
            className={`rounded-full p-2.5 backdrop-blur-sm transition ${micOn ? "bg-black/50 hover:bg-black/70" : "bg-red-600/90"}`}
            title={micOn ? "Mute microphone" : "Unmute microphone"}
          >
            {micOn ? <Mic size={18} /> : <MicOff size={18} />}
          </button>
        </div>
      </section>

      {/* Right: conversation, live caption, optional buttons */}
      <section className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4 lg:w-1/2 lg:gap-4 lg:p-6">
        {/* Progress + status */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            {isFormal ? (
              <div className="flex items-center gap-3">
                <span className="shrink-0 text-xs font-medium text-teal-400">
                  Question {currentIndex + 1} of {questions.length}
                </span>
                <div className="h-1.5 flex-1 rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-linear-to-r from-teal-500 to-teal-400 transition-all duration-300"
                    style={{ width: `${((currentIndex + 1) / Math.max(1, questions.length)) * 100}%` }}
                  />
                </div>
              </div>
            ) : (
              <span className="text-xs font-medium text-teal-400">
                {moodCheck ? "Quick check-in" : state === "permission_wait" ? "Ready to begin" : "Getting to know you"}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs" role="status">
              <span className={`h-2 w-2 rounded-full ${statusColor} ${working ? "" : "animate-pulse"}`} />
              {statusLabel}
            </span>
            <ComfortToggles
              variant="dark"
              largeText={comfort.largeText}
              slowVoice={comfort.slowVoice}
              onToggleLargeText={comfort.toggleLargeText}
              onToggleSlowVoice={comfort.toggleSlowVoice}
              moreTime={comfort.moreTime}
              onToggleMoreTime={comfort.toggleMoreTime}
            />
            <button
              onClick={() => setHandsFree((v) => !v)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${handsFree ? "bg-teal-600" : "bg-white/10 text-slate-300"}`}
              title={handsFree ? "Hands-free on: Amumata moves on after confirming with you" : "Hands-free off: use voice commands or buttons to move on"}
            >
              Hands-free {handsFree ? "on" : "off"}
            </button>
            <button
              onClick={tts.toggleMute}
              className={`rounded-full p-1.5 transition ${tts.isMuted ? "bg-red-600" : "bg-white/10 hover:bg-white/20"}`}
              title={tts.isMuted ? "Unmute Amumata's voice" : "Mute Amumata's voice"}
            >
              {tts.isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
            </button>
          </div>
        </div>

        {crisis && <CrisisCard lang={detectedLang} notified={crisis.notified} />}

        {/* What Amumata is asking */}
        <div className="rounded-2xl border border-teal-500/20 bg-teal-500/5 p-4 md:p-5">
          <div className="mb-2 flex items-center gap-2">
            <MessageCircle size={14} className="text-teal-400" />
            <span className="text-xs font-medium text-teal-400">Amumata</span>
            {tts.isSpeaking && <span className="animate-pulse text-xs text-slate-400">speaking…</span>}
          </div>
          <p className={`font-medium leading-relaxed ${comfort.largeText ? "text-2xl md:text-3xl" : "text-lg md:text-xl"}`}>
            {spokenLine ? (
              CONVERSATION_LINES[spokenLine][detectedLang]
            ) : aiPrompt?.kind === "localized" ? (
              <LocalizedBubble
                line={aiPrompt.line}
                primary={langDetected ? detectedLang : aiPrompt.primary}
                large={comfort.largeText}
              />
            ) : aiPrompt ? (
              <>
                <span>{aiPrompt.main}</span>
                {aiPrompt.sub && (
                  <span className={`mt-2 block font-normal text-slate-400 ${comfort.largeText ? "text-lg" : "text-sm"}`}>
                    {aiPrompt.sub}
                  </span>
                )}
              </>
            ) : null}
          </p>
          {voiceIsEnglish && <p className="mt-3 text-xs text-slate-400">{VOICE_FALLBACK_NOTE[detectedLang]}</p>}
        </div>

        {/* What the patient is saying — or, at the start and end, the faces to tap */}
        {moodCheck ? (
          <MoodCheck lang={detectedLang} onChoose={chooseMood} large={comfort.largeText} />
        ) : (
          <CaptionPanel
            segments={captions.turnSegments}
            interim={phase === "speaking" ? "" : captions.interim}
            engine={captions.engine}
            listening={listening}
            voiceActive={captions.voiceActive}
            getLevel={captions.getLevel}
            placeholder={phase === "speaking" ? "Your words will appear here as you speak." : "Go ahead — I'm listening."}
            largeText={comfort.largeText}
          />
        )}
        {isFormal && !onBreak && (
          <FeelingWords
            lang={detectedLang}
            selected={feelings[currentIndex] ?? []}
            onToggle={handleFeelingToggle}
            large={comfort.largeText}
            highlight={checkInOpen}
          />
        )}
        {isFormal && !onBreak && checkInOpen && (
          <CheckInActions
            lang={detectedLang}
            onContinue={handleCheckInContinue}
            onBreak={handleBreakButton}
            onSkip={handleNextButton}
          />
        )}
        {phase === "confirming" && moveOnAt !== null && !captions.voiceActive && !onBreak && <MoveOnCountdown until={moveOnAt} />}
        {onBreak && (
          <div className="rounded-2xl border border-sky-400/30 bg-sky-500/10 p-4 text-center" role="status">
            <p className="flex items-center justify-center gap-2 text-sm font-semibold text-sky-100">
              <Coffee size={16} /> On a break — take all the time you need
            </p>
            <p className="mt-1 text-xs text-sky-200/80">Your answer isn't being recorded and the timer is paused. Say “ready” or press the button.</p>
            <button onClick={handleResumeButton} className={`${roundBtn} mx-auto mt-3 bg-teal-600 px-6 hover:bg-teal-700`}>
              <Play size={16} /> I'm ready — continue
            </button>
          </div>
        )}
        {captions.error && <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-200">{captions.error}</p>}
        <p className={`text-center text-slate-500 ${comfort.largeText ? "text-sm" : "text-xs"}`}>
          {voiceTips(detectedLang, questionTiming(comfort.moreTime).answeredSilenceMs / 1000)}
        </p>

        {/* Optional buttons — everything here can also be done by voice */}
        <div className="rounded-2xl border border-white/10 bg-white/5">
          <button
            onClick={() => setControlsOpen((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-slate-400"
          >
            Buttons (optional)
            {controlsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {controlsOpen && (
            <div className="space-y-3 border-t border-white/10 p-4">
              {isFormal && onBreak && (
                <button onClick={handleEnd} className={`${roundBtn} w-full bg-red-600/80 hover:bg-red-600`}>
                  <StopCircle size={16} /> End
                </button>
              )}
              {isFormal && !onBreak && (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {phase === "confirming" ? (
                    <button onClick={handleKeepTalking} className={`${roundBtn} bg-white/10 hover:bg-white/20`}>
                      <Hand size={16} /> Keep talking
                    </button>
                  ) : (
                    <button onClick={handleRepeatButton} disabled={working} className={`${roundBtn} bg-white/10 hover:bg-white/20`}>
                      <RotateCcw size={16} /> Repeat
                    </button>
                  )}
                  <button onClick={handleBreakButton} disabled={working} className={`${roundBtn} bg-white/10 hover:bg-white/20`}>
                    <Coffee size={16} /> Take a break
                  </button>
                  <button
                    onClick={handleNextButton}
                    disabled={working}
                    className={`${roundBtn} bg-teal-600 hover:bg-teal-700`}
                  >
                    {isLastQuestion ? (
                      <>
                        <StopCircle size={16} /> Done — finish
                      </>
                    ) : (
                      <>
                        Done — next question <SkipForward size={16} />
                      </>
                    )}
                  </button>
                  <button onClick={handleEnd} className={`${roundBtn} bg-red-600/80 hover:bg-red-600`}>
                    <StopCircle size={16} /> End
                  </button>
                </div>
              )}

              {state === "permission_wait" && (
                <button onClick={handleStartButton} className={`${roundBtn} w-full bg-teal-600 hover:bg-teal-700`}>
                  Start the interview
                </button>
              )}

              {(state === "rapport_wait" || state === "rapport_chat" || state === "rapport_intro") && (
                <>
                  <div className="flex gap-2">
                    <input
                      value={typedAnswer}
                      onChange={(e) => setTypedAnswer(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleTypedAnswer()}
                      disabled={state !== "rapport_wait"}
                      placeholder="Or type your answer…"
                      className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm placeholder:text-slate-500 focus:border-teal-500 focus:outline-none disabled:opacity-40"
                    />
                    <button
                      onClick={handleTypedAnswer}
                      disabled={!typedAnswer.trim() || state !== "rapport_wait"}
                      className={`${roundBtn} bg-teal-600 hover:bg-teal-700`}
                      aria-label="Send typed answer"
                    >
                      <Send size={16} />
                    </button>
                  </div>
                  <button onClick={handleSkipWarmup} className="w-full text-center text-sm text-slate-400 transition hover:text-slate-200">
                    Skip introduction and start interview
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Warm-up answers so far */}
        {!isFormal && rapportResponses.length > 0 && (
          <div className="space-y-2">
            {rapportResponses.map((r, i) => (
              <div key={i} className="rounded-xl bg-white/5 p-3">
                <p className="text-xs text-slate-500">{r.question}</p>
                <p className="mt-1 text-sm text-slate-200">{r.answer}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
