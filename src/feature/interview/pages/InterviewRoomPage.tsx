import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  SkipForward,
  StopCircle,
  Loader2,
  Volume2,
  VolumeX,
  RotateCcw,
  MessageCircle,
} from "lucide-react";
import { interviewLinksApi } from "../../../shared/api/interviewLinksApi";
import { translateQuestion } from "../../../shared/api/translateApi";
import { storeFiles } from "../../../shared/utils/fileStorage";
import WaveVisualizer from "../components/WaveVisualizer";
import { useTTS } from "../hooks/useTTS";
import {
  detectRapportCategory,
  detectResponseLanguage,
  pickAcknowledgment,
  fillName,
  languageLabel,
  TTS_LOCALE,
  INTRO_LINES,
  RAPPORT_QUESTIONS,
  PERMISSION_LINES,
  type LocalizedLine,
  type ResponseLanguage,
} from "../hooks/rapportUtils";
import { useAutoProceed } from "../hooks/useAutoProceed";

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
  | "idle"
  | "recording"
  | "finished";

/**
 * Prompt bubble text. Before the patient's language is known, show all three
 * so the patient can read theirs; after, lead with their language + English.
 */
function LocalizedBubble({
  line,
  primary,
}: {
  line: LocalizedLine;
  primary: ResponseLanguage | "all";
}) {
  const [main, ...rest] =
    primary === "all"
      ? [line.en, line.tl, line.ceb]
      : primary === "en"
        ? [line.en]
        : [line[primary], line.en];
  return (
    <>
      <span>{main}</span>
      {rest.map((text) => (
        <span key={text} className="mt-2 block text-sm font-normal text-slate-300">
          {text}
        </span>
      ))}
    </>
  );
}

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

  const [questions, setQuestions] = useState<string[]>([]);
  const [patientName, setPatientName] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [state, setState] = useState<InterviewState>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [cameraError, setCameraError] = useState("");
  const [linkValid, setLinkValid] = useState(true);
  const [responses, setResponses] = useState<{ question: string; answer: string }[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [rapportResponses, setRapportResponses] = useState<
    { question: string; answer: string; acknowledgment: string }[]
  >([]);
  const [rapportQuestionIndex, setRapportQuestionIndex] = useState(0);
  const [rapportInput, setRapportInput] = useState("");
  // "waiting" = Amumata speaking (or not yet done), "ready" = patient may speak,
  // "reviewing" = transcript captured, patient confirms/edits before submit.
  const [voicePhase, setVoicePhase] = useState<"waiting" | "ready" | "reviewing">("waiting");
  const [autoProceedEnabled, setAutoProceedEnabled] = useState(true);
  // Patient's base language — learned from their first response, then used for
  // question wording, acknowledgments, and TTS voice.
  const [detectedLang, setDetectedLang] = useState<ResponseLanguage>("en");
  const [langDetected, setLangDetected] = useState(false);
  // What the question card shows: translation first, English underneath.
  const [questionDisplay, setQuestionDisplay] = useState<{ main: string; sub?: string } | null>(null);

  const tts = useTTS();

  // Ask the question in the patient's language once known; before that, speak
  // English and show all three languages so the patient can pick theirs.
  const questionText = (q: LocalizedLine, lang: ResponseLanguage) =>
    lang === "en" ? q.en : q[lang];

  // Submit a rapport answer and speak the acknowledgment next (rapport_chat).
  const submitRapportAnswer = (text: string, lang: ResponseLanguage) => {
    const acknowledgment = pickAcknowledgment(
      detectRapportCategory(text),
      lang,
      rapportResponses.length
    );
    setRapportResponses((prev) => [
      ...prev,
      { question: questionText(RAPPORT_QUESTIONS[rapportQuestionIndex], lang), answer: text, acknowledgment },
    ]);
    setRapportInput("");
    setVoicePhase("waiting");
    setState("rapport_chat");
  };

  // Whisper capture for both modes. Auto = submit when transcription lands.
  // Manual = show the transcript for review before sending.
  const autoProceed = useAutoProceed({
    stream: streamRef.current,
    onTranscript: (text: string, whisperLang: string) => {
      const lang = detectResponseLanguage(text, whisperLang);
      setDetectedLang(lang);
      setLangDetected(true);
      if (autoProceedEnabled) {
        submitRapportAnswer(text, lang);
      } else {
        setRapportInput(text);
        setVoicePhase("reviewing");
      }
    },
    onError: () => {
      setVoicePhase("ready");
    },
    enabled: true,
  });

  // Load interview data from API by token
  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    interviewLinksApi
      .getByToken(token)
      .then((res) => {
        if (cancelled) return;
        const link = res.data;
        const qs = link.questions || [];
        const questionTexts = qs.map((q: any) => (typeof q === "string" ? q : q.text));
        if (questionTexts.length > 0) {
          setQuestions(questionTexts);
          setPatientName(link.patient_name || "Client");
          setTemplateName(link.question_set_name || "Interview");
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

  // Start camera/mic
  const startMedia = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraError("");
    } catch (err) {
      console.error("Media access error:", err);
      setCameraError("Camera or microphone access denied. Please allow access and reload.");
    }
  }, []);

  const stopMedia = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  // Capture a single frame from the video as a JPEG blob
  const captureFrame = useCallback((): Blob | null => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return null;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
    const byteString = atob(dataUrl.split(",")[1]);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: "image/jpeg" });
  }, []);

  // Start audio recording for the current question
  const startAudioRecording = useCallback(() => {
    if (!streamRef.current || !micOn) return;

    const audioTracks = streamRef.current.getAudioTracks();
    if (audioTracks.length === 0) return;

    const audioStream = new MediaStream(audioTracks);
    const recorder = new MediaRecorder(audioStream, { mimeType: "audio/webm" });
    audioChunksRef.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunksRef.current.push(e.data);
    };

    recorder.start();
    mediaRecorderRef.current = recorder;
  }, [micOn]);

  // Stop audio recording and return blob
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

  // Initialize camera on mount
  useEffect(() => {
    startMedia();
    return () => {
      stopMedia();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [startMedia, stopMedia]);

  // Timer
  useEffect(() => {
    if (state === "recording") {
      timerRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state]);

  // Re-attach the stream to the (re-mounted) video element when the screen
  // changes, but only if it isn't already bound — reassigning the same stream on
  // every state flip forces the preview to reinitialize and flicker.
  useEffect(() => {
    if (streamRef.current && videoRef.current && videoRef.current.srcObject !== streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [state]);

  // Toggle camera
  const toggleCamera = () => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !cameraOn;
        setCameraOn(!cameraOn);
      }
    }
  };

  // Toggle mic
  const toggleMic = () => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !micOn;
        setMicOn(!micOn);
      }
    }
  };

  // Disable mic audio track (for TTS playback)
  const disableMicTrack = useCallback(() => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) audioTrack.enabled = false;
    }
  }, []);

  // Enable mic audio track
  const enableMicTrack = useCallback(() => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) audioTrack.enabled = true;
    }
  }, []);

  // Speak with mic control — disables mic during TTS, re-enables after
  // Hold the latest tts in a ref so speakWithMicControl keeps a stable identity.
  // useTTS() returns a fresh object every render; depending on it directly would
  // recreate this callback each render, re-firing every effect that advances the
  // interview (the flicker + repeated synth.cancel that silenced the first question).
  const ttsRef = useRef(tts);
  useEffect(() => {
    ttsRef.current = tts;
  });

  const speakWithMicControl = useCallback(
    async (text: string, lang?: ResponseLanguage) => {
      disableMicTrack();
      try {
        await ttsRef.current.speak(text, lang ? TTS_LOCALE[lang] : undefined);
      } finally {
        enableMicTrack();
      }
    },
    [disableMicTrack, enableMicTrack]
  );

  // Guards so each prompt advances the interview exactly once. Keyed refs (not
  // reset-on-change) stay correct under React Strict Mode, which double-invokes
  // effects: without these a stale .then() runs setRapportQuestionIndex twice.
  const ranIntroRef = useRef(false);
  const ackedCountRef = useRef(0);

  // Latest values for the flow effects below. Language can change while an
  // effect is waiting on TTS (manual review), so read it through the ref —
  // putting it in deps would re-speak the question mid-answer.
  const autoProceedRef = useRef(autoProceed);
  const detectedLangRef = useRef(detectedLang);
  useEffect(() => {
    autoProceedRef.current = autoProceed;
    detectedLangRef.current = detectedLang;
  });

  // Rapport flow state machine
  useEffect(() => {
    if (state === "rapport_intro" && !ranIntroRef.current) {
      ranIntroRef.current = true;
      speakWithMicControl(fillName(INTRO_LINES.en, patientName)).then(() => {
        setState("rapport_wait");
      });
    }
  }, [state, patientName, speakWithMicControl]);

  useEffect(() => {
    if (state === "rapport_wait") {
      // Never listen while Amumata is speaking. Reset clears stale transcript.
      autoProceedRef.current.cancel();
      setVoicePhase("waiting");
      const lang = detectedLangRef.current;
      speakWithMicControl(questionText(RAPPORT_QUESTIONS[rapportQuestionIndex], lang), lang).then(() => {
        autoProceedRef.current.startListening();
        setVoicePhase("ready");
      });
    }
  }, [state, rapportQuestionIndex, speakWithMicControl]);

  useEffect(() => {
    if (state === "rapport_chat" && rapportResponses.length > ackedCountRef.current) {
      ackedCountRef.current = rapportResponses.length;
      const lastResponse = rapportResponses[rapportResponses.length - 1];
      if (lastResponse) {
        speakWithMicControl(lastResponse.acknowledgment, detectedLangRef.current).then(() => {
          if (rapportQuestionIndex < RAPPORT_QUESTIONS.length - 1) {
            setRapportQuestionIndex((i) => i + 1);
            setState("rapport_wait");
          } else {
            setState("permission_wait");
          }
        });
      }
    }
  }, [state, rapportResponses, rapportQuestionIndex, speakWithMicControl]);

  useEffect(() => {
    if (state === "permission_wait") {
      const lang = detectedLangRef.current;
      speakWithMicControl(PERMISSION_LINES[lang], lang);
    }
  }, [state, speakWithMicControl]);

  // Patient clicks mic to speak again (overrides auto-proceed)
  const handleStartListening = () => {
    if (tts.isSpeaking) return;
    autoProceed.cancel();
    tts.stop();
    setRapportInput("");
    setVoicePhase("ready");
    autoProceed.startListening();
  };

  // Patient stops recording manually — audio so far is still transcribed
  const handleStopListening = () => {
    autoProceed.stopListening();
  };

  // Retry: clear transcript and listen again
  const handleRetryVoice = () => {
    autoProceed.cancel();
    setRapportInput("");
    setVoicePhase("ready");
    autoProceed.startListening();
  };

  // Submit rapport response (typed, or edited transcript — overrides auto-proceed)
  const handleRapportSubmit = () => {
    const text = rapportInput.trim();
    if (!text) return;
    autoProceed.cancel();
    const lang = detectResponseLanguage(text);
    setDetectedLang(lang);
    setLangDetected(true);
    submitRapportAnswer(text, lang);
  };

  // Skip rapport, go straight to formal interview
  const handleSkipRapport = () => {
    autoProceed.cancel();
    tts.stop();
    setVoicePhase("waiting");
    setState("permission_wait");
  };

  // Ask a formal question in the patient's language. Translation is an
  // enhancement via the AI service — on any failure the English original is
  // shown and spoken, so the interview never depends on the translator.
  const questionTransCacheRef = useRef<Map<string, string>>(new Map());
  const askQuestion = async (index: number) => {
    const original = questions[index];
    if (!original) return;
    const lang = detectedLangRef.current;
    setQuestionDisplay({ main: original });
    if (lang === "en") {
      await speakWithMicControl(original);
      return;
    }
    const cacheKey = `${lang}|${original}`;
    let translated = questionTransCacheRef.current.get(cacheKey) ?? null;
    if (!translated) {
      translated = await translateQuestion(original, lang);
      if (translated) questionTransCacheRef.current.set(cacheKey, translated);
    }
    if (translated) {
      setQuestionDisplay({ main: translated, sub: original });
      await speakWithMicControl(translated, lang);
    } else {
      await speakWithMicControl(original);
    }
  };

  // Start formal interview from permission_wait or idle
  const handleStartInterview = () => {
    autoProceed.cancel();
    tts.stop();
    setState("recording");
    setElapsed(0);
    setResponses([]);
    capturedFramesRef.current.clear();
    capturedAudioRef.current.clear();
    setTimeout(() => {
      startAudioRecording();
      startFrameCapture();
      // Ask the first question in the patient's language
      askQuestion(0);
    }, 200);
  };

  // Start frame capture interval
  const startFrameCapture = useCallback(() => {
    if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
    const doCapture = () => {
      const frame = captureFrame();
      if (frame) {
        const existing = capturedFramesRef.current.get(currentIndex) || [];
        existing.push(frame);
        capturedFramesRef.current.set(currentIndex, existing);
      }
    };
    doCapture();
    frameIntervalRef.current = setInterval(doCapture, 3000);
  }, [currentIndex, captureFrame]);

  // Stop frame capture interval
  const stopFrameCapture = useCallback(() => {
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }
  }, []);

  // Next question
  const handleNext = async () => {
    if (analyzing) return;
    setAnalyzing(true);

    try {
      // Stop TTS if speaking
      tts.stop();

      stopFrameCapture();

      const frame = captureFrame();
      if (frame) {
        const existing = capturedFramesRef.current.get(currentIndex) || [];
        existing.push(frame);
        capturedFramesRef.current.set(currentIndex, existing);
      }

      const audio = await stopAudioRecording();
      if (audio) {
        capturedAudioRef.current.set(currentIndex, audio);
      }

      setResponses((prev) => [
        ...prev,
        { question: questions[currentIndex], answer: "[Audio response recorded]" },
      ]);

      if (currentIndex < questions.length - 1) {
        const nextIndex = currentIndex + 1;
        setCurrentIndex(nextIndex);
        setTimeout(() => {
          startAudioRecording();
          startFrameCapture();
          // Ask next question in the patient's language
          askQuestion(nextIndex);
        }, 100);
      } else {
        handleFinish();
      }
    } finally {
      setAnalyzing(false);
    }
  };

  // Finish interview
  const handleFinish = async () => {
    if (!token) return;
    setState("finished");
    tts.stop();
    stopFrameCapture();

    const lastAudio = await stopAudioRecording();
    if (lastAudio) {
      capturedAudioRef.current.set(currentIndex, lastAudio);
    }

    const lastFrame = captureFrame();
    if (lastFrame) {
      const existing = capturedFramesRef.current.get(currentIndex) || [];
      existing.push(lastFrame);
      capturedFramesRef.current.set(currentIndex, existing);
    }

    stopMedia();

    const finalResponses = [
      ...responses,
      { question: questions[currentIndex], answer: "[Audio response recorded]" },
    ];

    // Build File arrays for upload
    const files: File[] = [];
    capturedFramesRef.current.forEach((frames, questionIdx) => {
      frames.forEach((blob, frameIdx) => {
        files.push(new File([blob], `frame_${questionIdx}_${frameIdx}.jpg`, { type: "image/jpeg" }));
      });
    });
    capturedAudioRef.current.forEach((blob, idx) => {
      files.push(new File([blob], `audio_${idx}.webm`, { type: "audio/webm" }));
    });

    // Store interview metadata (rapport NOT included in formal data)
    const resultData = {
      token,
      patientName,
      templateName,
      questions,
      responses: finalResponses,
      duration: elapsed,
      completedAt: new Date().toISOString(),
    };
    sessionStorage.setItem(`amumata_result_${token}`, JSON.stringify(resultData));

    // Store rapport responses separately (sessionStorage only, not sent to analysis)
    if (rapportResponses.length > 0) {
      sessionStorage.setItem(
        `amumata_rapport_${token}`,
        JSON.stringify(rapportResponses)
      );
    }

    const fileEntries = files.map((file) => ({ name: file.name, type: file.type, blob: file }));
    await storeFiles(token, fileEntries);

    navigate(`/interview/${token}/processing`);
  };

  // Replay current question TTS
  const handleReplayQuestion = () => {
    if (tts.isSpeaking) {
      tts.stop();
    } else if (questions[currentIndex]) {
      askQuestion(currentIndex);
    }
  };

  // Format timer
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  // ─── Idle screen ───
  if (state === "idle") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F1F5F9] px-4">
        <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-md border border-slate-200 md:p-8">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-slate-900">Interview Room</h1>
            <p className="mt-1 text-sm text-slate-500">
              {templateName} — {questions.length} questions
            </p>
          </div>

          {/* Camera preview */}
          <div className="mb-6 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-6">
            <div className="relative mx-auto w-full max-w-md overflow-hidden rounded-xl bg-slate-900">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="aspect-video w-full object-cover"
              />
              {!cameraOn && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80">
                  <VideoOff size={48} className="text-slate-400" />
                </div>
              )}
            </div>
            {cameraError && (
              <p className="mt-3 text-center text-sm text-red-500">{cameraError}</p>
            )}
          </div>

          {/* Controls */}
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

          {/* Preparation guide */}
          <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4">
            <h3 className="mb-2 text-sm font-semibold text-blue-900">Before You Begin</h3>
            <ul className="space-y-1.5 text-sm text-blue-800">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-blue-500">•</span>
                Sit in a well-lit area — face the light source so your expressions are clearly visible
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-blue-500">•</span>
                Position your full face in the camera frame — keep a steady distance from the screen
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-blue-500">•</span>
                Speak clearly and at a normal volume — let your voice reflect how you truly feel
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-blue-500">•</span>
                Express yourself freely — this is a safe space. Your video is only reviewed by your therapist for better consultation
              </li>
            </ul>
          </div>

          {!linkValid && (
            <p className="mb-4 text-center text-sm text-yellow-600">
              Interview link not recognized. Using demo questions.
            </p>
          )}

          <button
            onClick={() => setState("rapport_intro")}
            disabled={!!cameraError}
            className="w-full rounded-lg bg-teal-600 py-3 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-50"
          >
            Start Interview
          </button>
        </div>
      </div>
    );
  }

  // ─── Finished screen ───
  if (state === "finished") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F1F5F9] px-4">
        <div className="w-full max-w-xl rounded-xl bg-white p-8 shadow-md border border-slate-200 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Interview Complete</h1>
          <p className="mt-2 text-slate-500">
            Thank you, {patientName}. Your responses have been recorded.
          </p>
          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            <p>Questions answered: {questions.length}</p>
            <p>Duration: {formatTime(elapsed)}</p>
          </div>
          <p className="mt-4 text-xs text-slate-400">
            Your therapist will review the results. This system does not provide a clinical diagnosis.
          </p>
          <button
            onClick={() => navigate(`/interview/${token}/processing`)}
            className="mt-6 w-full rounded-lg bg-teal-600 py-3 text-sm font-semibold text-white transition hover:bg-teal-700"
          >
            View Processing
          </button>
        </div>
      </div>
    );
  }

  // ─── Rapport screens (intro, wait, chat, permission_wait) ───
  if (
    state === "rapport_intro" ||
    state === "rapport_wait" ||
    state === "rapport_chat" ||
    state === "permission_wait"
  ) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-black">
        {/* Full-screen camera background */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="fixed inset-0 z-0 h-full w-full object-cover"
          style={{ height: "100dvh" }}
        />
        {!cameraOn && (
          <div className="fixed inset-0 z-10 flex items-center justify-center bg-slate-900/90">
            <VideoOff size={64} className="text-slate-500" />
          </div>
        )}
        <canvas ref={canvasRef} className="hidden" />

        {/* Overlay container */}
        <div className="relative z-20 flex min-h-screen flex-col" style={{ minHeight: "100dvh" }}>
          {/* Top: branding left, audio settings right */}
          <div className="flex items-center justify-between px-4 py-3 md:px-6">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500 text-sm font-bold text-white shadow-lg">
                A
              </div>
              <span className="text-sm font-semibold text-white drop-shadow-lg">Amumata</span>
            </div>
            <div className="flex items-center gap-2">
              {/* Auto-proceed toggle */}
              <button
                onClick={() => {
                  if (autoProceedEnabled) autoProceed.cancel();
                  setAutoProceedEnabled(!autoProceedEnabled);
                }}
                className={`rounded-full px-3 py-1.5 text-xs font-medium backdrop-blur-sm transition ${
                  autoProceedEnabled
                    ? "bg-teal-600/80 text-white"
                    : "bg-black/40 text-slate-300 hover:bg-black/60"
                }`}
                title={autoProceedEnabled ? "Auto-proceed: ON (answers send automatically)" : "Auto-proceed: OFF (you confirm before sending)"}
              >
                {autoProceedEnabled ? "Auto" : "Manual"}
              </button>
              <button
                onClick={tts.toggleMute}
                className={`rounded-full p-2 backdrop-blur-sm transition ${
                  tts.isMuted
                    ? "bg-red-600/80 text-white"
                    : "bg-black/40 text-white hover:bg-black/60"
                }`}
                title={tts.isMuted ? "Unmute voice" : "Mute voice"}
              >
                {tts.isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
            </div>
          </div>

          {/* Middle: conversation content */}
          <div className="flex flex-1 flex-col justify-center px-4 pb-32 md:px-8 lg:w-1/2">
            {/* Amumata message */}
            <div className="mb-6 max-w-lg rounded-2xl border border-white/10 bg-black/50 p-5 backdrop-blur-md md:p-6">
              <div className="mb-2 flex items-center gap-2">
                <MessageCircle size={14} className="text-teal-400" />
                <span className="text-xs font-medium text-teal-400">Amumata</span>
                {tts.isSpeaking && (
                  <span className="ml-2 animate-pulse text-xs text-slate-400">Speaking...</span>
                )}
              </div>
              <p className="text-base font-medium leading-relaxed text-white md:text-lg">
                {state === "rapport_intro" && (
                  <LocalizedBubble
                    line={{
                      en: fillName(INTRO_LINES.en, patientName),
                      tl: fillName(INTRO_LINES.tl, patientName),
                      ceb: fillName(INTRO_LINES.ceb, patientName),
                    }}
                    primary="all"
                  />
                )}
                {state === "rapport_wait" && (
                  <LocalizedBubble
                    line={RAPPORT_QUESTIONS[rapportQuestionIndex]}
                    primary={langDetected ? detectedLang : "all"}
                  />
                )}
                {state === "rapport_chat" &&
                  rapportResponses[rapportResponses.length - 1]?.acknowledgment}
                {state === "permission_wait" && (
                  <LocalizedBubble line={PERMISSION_LINES} primary={langDetected ? detectedLang : "all"} />
                )}
              </p>
            </div>

            {/* Input area */}
            {(state === "rapport_wait" || state === "permission_wait") && (
              <div className="mb-6 max-w-lg">
                {state === "rapport_wait" && (
                  <>
                    {/* Voice input status */}
                    <div className="mb-4 rounded-xl border border-white/10 bg-black/40 p-4 backdrop-blur-md">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                            autoProceed.isListening
                              ? "bg-red-600 text-white animate-pulse"
                              : tts.isSpeaking || voicePhase === "waiting"
                                ? "bg-slate-700/80 text-slate-300"
                                : "bg-teal-600 text-white"
                          }`}
                        >
                          {tts.isSpeaking ? (
                            <Volume2 size={18} />
                          ) : (
                            <Mic size={18} />
                          )}
                        </div>
                        <div className="flex-1 text-sm">
                          {tts.isSpeaking ? (
                            <p className="animate-pulse text-slate-300">Amumata is speaking...</p>
                          ) : autoProceed.isProcessing ? (
                            <p className="animate-pulse text-slate-300">Processing your response...</p>
                          ) : autoProceed.isListening ? (
                            <p className="font-medium text-white">Listening... speak now</p>
                          ) : voicePhase === "reviewing" ? (
                            <p className="font-medium text-teal-300">Here's what we heard</p>
                          ) : (
                            <p className="font-medium text-white">Your turn to speak</p>
                          )}
                          {/* Show detected language */}
                          {autoProceed.whisperLanguage && voicePhase === "reviewing" && (
                            <p className="mt-1 text-xs text-slate-500">
                              Language detected: {languageLabel(autoProceed.whisperLanguage)}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Show errors from Whisper capture */}
                      {autoProceed.whisperError && (
                        <p className="mt-3 rounded-lg bg-red-900/30 px-3 py-2 text-sm text-red-200">
                          {autoProceed.whisperError}
                        </p>
                      )}
                      {!autoProceed.isSupported && (
                        <p className="mt-3 rounded-lg bg-yellow-900/30 px-3 py-2 text-sm text-yellow-200">
                          Voice input isn't available right now. Please type your response below.
                        </p>
                      )}

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {/* Capture controls — Whisper in both modes */}
                        {autoProceed.isListening ? (
                          <button
                            onClick={handleStopListening}
                            className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
                          >
                            <StopCircle size={16} />
                            Stop
                          </button>
                        ) : (
                          <button
                            onClick={handleStartListening}
                            disabled={tts.isSpeaking || voicePhase === "waiting" || !autoProceed.isSupported}
                            className="flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-50"
                          >
                            <Mic size={16} />
                            {voicePhase === "reviewing" ? "Speak again" : "Speak your answer"}
                          </button>
                        )}
                        {/* Retry — during reviewing */}
                        {voicePhase === "reviewing" && (
                          <button
                            onClick={handleRetryVoice}
                            className="flex items-center gap-2 rounded-lg bg-slate-700/80 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-600"
                          >
                            <RotateCcw size={16} />
                            Retry
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Text input fallback */}
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={rapportInput}
                        onChange={(e) => {
                          setRapportInput(e.target.value);
                          if (voicePhase === "reviewing") setVoicePhase("ready");
                        }}
                        onKeyDown={(e) => e.key === "Enter" && handleRapportSubmit()}
                        placeholder={
                          voicePhase === "reviewing"
                            ? "Edit if needed, then send..."
                            : "Or type your response..."
                        }
                        className="flex-1 rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-white placeholder:text-slate-400 focus:border-teal-500 focus:outline-none backdrop-blur-md"
                      />
                      <button
                        onClick={handleRapportSubmit}
                        disabled={!rapportInput.trim()}
                        className="rounded-xl bg-teal-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-50"
                      >
                        Send
                      </button>
                    </div>
                    <button
                      onClick={handleSkipRapport}
                      className="mt-3 w-full text-center text-sm text-slate-400 transition hover:text-slate-200"
                    >
                      Skip introduction and start interview
                    </button>
                  </>
                )}
                {state === "permission_wait" && (
                  <div className="flex gap-3">
                    <button
                      onClick={handleStartInterview}
                      className="flex-1 rounded-lg bg-teal-600 py-3 text-sm font-semibold text-white transition hover:bg-teal-700"
                    >
                      Start Interview
                    </button>
                    <button
                      onClick={handleSkipRapport}
                      className="rounded-xl bg-slate-700/80 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-600 backdrop-blur-sm"
                    >
                      Back
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Rapport history */}
            {rapportResponses.length > 0 && (
              <div className="max-w-lg space-y-3">
                {rapportResponses.map((r, i) => (
                  <div key={i} className="rounded-xl bg-black/40 p-4 backdrop-blur-md">
                    <p className="text-xs text-slate-400">{r.question}</p>
                    <p className="mt-1 text-sm text-slate-200">{r.answer}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─── Recording screen — main interview ───
  return (
    <div className="relative min-h-screen overflow-hidden bg-black">
      {/* Full-screen camera background */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="fixed inset-0 z-0 h-full w-full object-cover"
        style={{ height: "100dvh" }}
      />
      {!cameraOn && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-slate-900/90">
          <VideoOff size={64} className="text-slate-500" />
        </div>
      )}
      <canvas ref={canvasRef} className="hidden" />

      {/* Overlay container */}
      <div className="relative z-20 flex min-h-screen flex-col" style={{ minHeight: "100dvh" }}>
        {/* Top: branding left, status + audio right */}
        <div className="flex items-center justify-between px-4 py-3 md:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-500 text-sm font-bold text-white shadow-lg">
              A
            </div>
            <span className="text-sm font-semibold text-white drop-shadow-lg">Amumata</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-full bg-black/40 px-3 py-1.5 backdrop-blur-sm">
              <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
              <span className="text-xs font-medium text-white">Recording</span>
              <span className="font-mono text-xs text-slate-300">{formatTime(elapsed)}</span>
            </div>
            <button
              onClick={tts.toggleMute}
              className={`rounded-full p-2 backdrop-blur-sm transition ${
                tts.isMuted
                  ? "bg-red-600/80 text-white"
                  : "bg-black/40 text-white hover:bg-black/60"
              }`}
              title={tts.isMuted ? "Unmute voice" : "Mute voice"}
            >
              {tts.isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
          </div>
        </div>

        {/* Question card — upper left */}
        <div className="px-4 md:px-6">
          <div className="max-w-md rounded-2xl border border-white/10 bg-black/50 p-4 backdrop-blur-md md:p-5">
            {/* Progress bar */}
            <div className="mb-3 flex items-center gap-3">
              <span className="text-xs font-medium text-teal-400">
                Question {currentIndex + 1} of {questions.length}
              </span>
              <div className="h-1.5 flex-1 rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-teal-500 to-teal-400 transition-all duration-300"
                  style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
                />
              </div>
            </div>
            {/* Question text — translated for the patient, English underneath */}
            <p className="text-base font-medium leading-relaxed text-white md:text-lg">
              {questionDisplay?.main ?? questions[currentIndex]}
            </p>
            {questionDisplay?.sub && (
              <p className="mt-2 text-sm font-normal text-slate-300">{questionDisplay.sub}</p>
            )}
            {tts.isSpeaking && (
              <p className="mt-2 animate-pulse text-xs text-teal-400">Speaking question...</p>
            )}
            <p className="mt-2 text-xs text-slate-400">
              Take your time. Speak naturally when you&apos;re ready.
            </p>
          </div>
          {/* Wave visualizer */}
          <div className="mt-3 w-48">
            <WaveVisualizer isActive={state === "recording" && micOn} />
          </div>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Bottom control bar */}
        <div className="flex justify-center px-4 pb-6 pt-2" style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}>
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/50 px-4 py-2.5 backdrop-blur-md md:gap-3 md:px-5 md:py-3">
            {/* Camera toggle */}
            <button
              onClick={toggleCamera}
              className={`flex flex-col items-center gap-0.5 rounded-full p-2.5 transition md:p-3 ${
                cameraOn
                  ? "bg-white/10 text-white hover:bg-white/20"
                  : "bg-red-600/80 text-white"
              }`}
              title={cameraOn ? "Turn off camera" : "Turn on camera"}
            >
              {cameraOn ? <Video size={20} /> : <VideoOff size={20} />}
              <span className="text-[10px]">{cameraOn ? "Camera" : "Off"}</span>
            </button>

            {/* Mic toggle */}
            <button
              onClick={toggleMic}
              className={`flex flex-col items-center gap-0.5 rounded-full p-2.5 transition md:p-3 ${
                micOn
                  ? "bg-white/10 text-white hover:bg-white/20"
                  : "bg-red-600/80 text-white"
              }`}
              title={micOn ? "Mute microphone" : "Unmute microphone"}
            >
              {micOn ? <Mic size={20} /> : <MicOff size={20} />}
              <span className="text-[10px]">{micOn ? "Mic" : "Off"}</span>
            </button>

            {/* Replay question */}
            <button
              onClick={handleReplayQuestion}
              disabled={analyzing}
              className="flex flex-col items-center gap-0.5 rounded-full bg-white/10 p-2.5 text-white transition hover:bg-white/20 disabled:opacity-50 md:p-3"
              title="Replay question"
            >
              <RotateCcw size={20} />
              <span className="text-[10px]">Replay</span>
            </button>

            {/* Divider */}
            <div className="mx-1 h-8 w-px bg-white/20" />

            {/* Next / Finish */}
            <button
              onClick={handleNext}
              disabled={analyzing}
              className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white transition md:px-6 md:py-3 ${
                analyzing
                  ? "cursor-wait bg-teal-500/60"
                  : "bg-teal-600 hover:bg-teal-700"
              }`}
            >
              {analyzing ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span className="hidden sm:inline">Analyzing...</span>
                </>
              ) : currentIndex < questions.length - 1 ? (
                <>
                  <span className="hidden sm:inline">Next</span>
                  <SkipForward size={16} />
                </>
              ) : (
                <>
                  <span className="hidden sm:inline">Finish</span>
                  <StopCircle size={16} />
                </>
              )}
            </button>

            {/* End interview */}
            <button
              onClick={handleFinish}
              className="flex flex-col items-center gap-0.5 rounded-full bg-red-600/80 p-2.5 text-white transition hover:bg-red-600 md:p-3"
              title="End interview"
            >
              <StopCircle size={20} />
              <span className="text-[10px]">End</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}