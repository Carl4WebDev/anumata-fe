import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Video, VideoOff, Mic, MicOff, SkipForward, StopCircle, Clock } from "lucide-react";
import { interviewLinksApi } from "../../../shared/api/interviewLinksApi";
import { storeFiles } from "../../../shared/utils/fileStorage";
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const capturedFramesRef = useRef<Map<number, Blob>>(new Map());
  const capturedAudioRef = useRef<Map<number, Blob>>(new Map());

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

  // Load interview data from API by token
  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    interviewLinksApi.getByToken(token).then((res) => {
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
    }).catch(() => {
      if (cancelled) return;
      setQuestions(FALLBACK_QUESTIONS);
      setPatientName("Client");
      setTemplateName("Demo Template");
      setLinkValid(false);
    });

    return () => { cancelled = true; };
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
    // Convert to JPEG blob synchronously via toDataURL
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

  // Stop audio recording and return blob via callback
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

  // Re-assign stream to video element when screen changes (idle→recording swaps the element)
  useEffect(() => {
    if (streamRef.current && videoRef.current) {
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

  // Start recording
  const handleStart = () => {
    setState("recording");
    setElapsed(0);
    setResponses([]);
    capturedFramesRef.current.clear();
    capturedAudioRef.current.clear();
    // Start audio recording for the first question
    setTimeout(() => startAudioRecording(), 200);
  };

  // Next question — capture frame + audio for this question
  const handleNext = async () => {
    // Capture video frame
    const frame = captureFrame();
    if (frame) {
      capturedFramesRef.current.set(currentIndex, frame);
    }

    // Stop audio recording for this question
    const audio = await stopAudioRecording();
    if (audio) {
      capturedAudioRef.current.set(currentIndex, audio);
    }

    // Save response entry
    setResponses((prev) => [
      ...prev,
      { question: questions[currentIndex], answer: "[Audio response recorded]" },
    ]);

    if (currentIndex < questions.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      // Start audio recording for next question (after a tick so state updates)
      setTimeout(() => startAudioRecording(), 100);
    } else {
      // Last question answered — finish
      handleFinish();
    }
  };

  // Finish interview — stop last audio, collect all media, navigate to processing
  const handleFinish = async () => {
    setState("finished");

    // Stop and capture last question's audio
    const lastAudio = await stopAudioRecording();
    if (lastAudio) {
      capturedAudioRef.current.set(currentIndex, lastAudio);
    }

    // Capture final frame
    const lastFrame = captureFrame();
    if (lastFrame) {
      capturedFramesRef.current.set(currentIndex, lastFrame);
    }

    stopMedia();

    // Save the last response
    const finalResponses = [
      ...responses,
      { question: questions[currentIndex], answer: "[Audio response recorded]" },
    ];

    // Build File arrays for upload
    const files: File[] = [];
    capturedFramesRef.current.forEach((blob, idx) => {
      files.push(new File([blob], `frame_${idx}.jpg`, { type: "image/jpeg" }));
    });
    capturedAudioRef.current.forEach((blob, idx) => {
      files.push(new File([blob], `audio_${idx}.webm`, { type: "audio/webm" }));
    });

    // Store interview metadata + files in sessionStorage for ProcessingPage
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

    // Store files in IndexedDB (sessionStorage has a ~5MB limit)
    const fileEntries = files.map((file) => ({ name: file.name, type: file.type, blob: file }));
    await storeFiles(token, fileEntries);

    navigate(`/interview/${token}/processing`);
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
          <canvas ref={canvasRef} className="hidden" />
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
