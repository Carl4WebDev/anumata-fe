import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Video, VideoOff, Mic, MicOff, SkipForward, StopCircle, Clock } from "lucide-react";
import { getLinkByToken } from "../../../shared/utils/interviewStore";
import WaveVisualizer from "../components/WaveVisualizer";

// Hardcoded fallback questions if token not found
const FALLBACK_QUESTIONS = [
  "Can you tell me about yourself and how you've been feeling lately?",
  "Is there a specific situation that has been causing you stress recently?",
  "How do you usually cope when you feel overwhelmed?",
  "Can you describe a moment this week when you felt happy or at peace?",
  "Is there anything about your daily life you wish was different?",
  "How would you describe your relationship with the people closest to you?",
];

type InterviewState = "idle" | "recording" | "paused" | "finished";

export default function InterviewRoom() {
  const { token } = useParams();
  const navigate = useNavigate();

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  // Load interview data from localStorage
  useEffect(() => {
    if (!token) return;
    const link = getLinkByToken(token);
    if (link && link.questions.length > 0) {
      setQuestions(link.questions);
      setPatientName(link.patientName);
      setTemplateName(link.templateName);
    } else {
      // Use fallback questions for demo
      setQuestions(FALLBACK_QUESTIONS);
      setPatientName("Client");
      setTemplateName("Demo Template");
      setLinkValid(false);
    }
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

  // Start recording
  const handleStart = () => {
    setState("recording");
    setElapsed(0);
    setResponses([]);
  };

  // Next question
  const handleNext = () => {
    // Save a simulated response
    setResponses((prev) => [
      ...prev,
      { question: questions[currentIndex], answer: "[Audio response recorded]" },
    ]);

    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      // Last question answered — finish
      handleFinish();
    }
  };

  // Finish interview
  const handleFinish = () => {
    setState("finished");
    stopMedia();

    // Save the last response
    const finalResponses = [
      ...responses,
      { question: questions[currentIndex], answer: "[Audio response recorded]" },
    ];

    // Store results in localStorage for the processing/results pages
    const resultData = {
      token,
      patientName,
      templateName,
      questions,
      responses: finalResponses,
      duration: elapsed,
      completedAt: new Date().toISOString(),
    };
    localStorage.setItem(`amumata_result_${token}`, JSON.stringify(resultData));
  };

  // Format timer
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  // Idle screen — before recording starts
  if (state === "idle") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F1F5F9] px-4">
        <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-md border border-slate-200 md:p-8">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-slate-900">Interview Room</h1>
            <p className="mt-1 text-sm text-slate-500">
              {templateName} — {questions.length} questions
            </p>
          </div>

          {/* Camera preview */}
          <div className="mb-6 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-6">
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
          <div className="mb-6 flex items-center justify-center gap-4">
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

          {!linkValid && (
            <p className="mb-4 text-center text-sm text-yellow-600">
              Interview link not recognized. Using demo questions.
            </p>
          )}

          <button
            onClick={handleStart}
            disabled={!!cameraError}
            className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            Start Interview
          </button>
        </div>
      </div>
    );
  }

  // Finished screen
  if (state === "finished") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F1F5F9] px-4">
        <div className="w-full max-w-xl rounded-2xl bg-white p-8 shadow-md border border-slate-200 text-center">
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
            className="mt-6 w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            View Processing
          </button>
        </div>
      </div>
    );
  }

  // Recording screen — main interview
  return (
    <div className="flex min-h-screen flex-col bg-[#08132E]">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 md:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500 text-sm font-bold text-white">
            A
          </div>
          <span className="text-sm font-medium text-white">Amumata</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-white">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
            <span className="text-sm font-medium">Recording</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-300">
            <Clock size={14} />
            <span className="text-sm font-mono">{formatTime(elapsed)}</span>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col lg:flex-row">
        {/* Camera + Wave */}
        <div className="flex flex-col items-center justify-center p-4 lg:w-1/2 lg:p-8">
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-slate-900">
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
          <div className="mt-4 w-full max-w-md">
            <WaveVisualizer isActive={state === "recording" && micOn} />
          </div>
        </div>

        {/* Question + Controls */}
        <div className="flex flex-1 flex-col justify-center p-4 lg:p-8">
          {/* Progress */}
          <div className="mb-4 flex items-center gap-3">
            <span className="text-sm text-slate-400">
              Question {currentIndex + 1} of {questions.length}
            </span>
            <div className="h-2 flex-1 rounded-full bg-slate-700">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-teal-400 transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Question card */}
          <div className="mb-8 rounded-2xl border-l-4 border-blue-500 bg-[#13244D] p-6 md:p-8">
            <p className="text-lg font-medium leading-relaxed text-white md:text-xl">
              {questions[currentIndex]}
            </p>
          </div>

          {/* Guidance */}
          <p className="mb-6 text-center text-sm text-slate-400">
            Take your time. Speak naturally when you&apos;re ready.
          </p>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={toggleCamera}
              className={`rounded-full p-3 transition ${
                cameraOn ? "bg-slate-700 text-white hover:bg-slate-600" : "bg-red-600 text-white"
              }`}
              title={cameraOn ? "Turn off camera" : "Turn on camera"}
            >
              {cameraOn ? <Video size={20} /> : <VideoOff size={20} />}
            </button>
            <button
              onClick={toggleMic}
              className={`rounded-full p-3 transition ${
                micOn ? "bg-slate-700 text-white hover:bg-slate-600" : "bg-red-600 text-white"
              }`}
              title={micOn ? "Mute" : "Unmute"}
            >
              {micOn ? <Mic size={20} /> : <MicOff size={20} />}
            </button>
            <button
              onClick={handleNext}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              {currentIndex < questions.length - 1 ? (
                <>
                  Next Question
                  <SkipForward size={16} />
                </>
              ) : (
                <>
                  Finish Interview
                  <StopCircle size={16} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
