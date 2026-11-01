import { useCallback, useEffect, useRef, useState } from "react";
import { transcribeAudio } from "../../../shared/api/sttApi";
import { createPhraseSegmenter } from "./phraseSegmenter";
import { readRms } from "./useMicCheck";
import type { ResponseLanguage } from "./rapportUtils";
import {
  browserCaptionsAllowed,
  FATAL_SPEECH_ERRORS,
  getSpeechRecognition,
  recognitionLocale,
  type SpeechRecognizer,
  type SpeechResultEvent,
} from "./browserSpeech";

export interface CaptionSegment {
  id: number;
  /** Turn (question / prompt) the phrase was spoken in. */
  turn: number;
  status: "pending" | "done" | "failed";
  text: string;
  language: string;
}

export interface CaptionPhrase {
  turn: number;
  text: string;
  language: string;
}

export interface CaptionActivity {
  /** Last time the patient's voice was heard this turn. */
  lastVoiceAt: number | null;
  voiceActive: boolean;
  /** Speech heard but not final yet — never decide the turn before it lands. */
  pending: number;
}

/**
 * "browser" = the browser's speech recognition: words appear while the
 * patient talks (Chrome / Edge / Safari). "whisper" = phrase-by-phrase via the
 * AI service: works everywhere, but only as fast as the server.
 */
export type CaptionEngine = "browser" | "whisper";

interface UseLiveCaptionsOptions {
  /** Patient's known language — picks the recognition language. */
  languageHint?: ResponseLanguage;
  /** Each final phrase, as soon as it lands. */
  onPhrase?: (phrase: CaptionPhrase) => void;
}

const POLL_MS = 100;
// Whisper keeps working on a request after the browser gives up, so a short
// timeout only creates a backlog; wait for slow machines instead.
const WHISPER_TIMEOUT_MS = 60000;
// Safety net: if the browser never finalizes words it showed, commit them.
const STALE_INTERIM_MS = 2500;
// Recognition that keeps ending right after starting is broken here (blocked
// service, no mic) — after this many quick ends, use server captions instead.
const QUICK_END_MS = 1000;
const MAX_QUICK_ENDS = 5;
const EMPTY_RESULTS = new Set(["", "[No speech detected]", "[Transcription failed]"]);

interface ActiveRecorder {
  recorder: MediaRecorder;
  chunks: Blob[];
  turn: number;
}

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined" || typeof MediaRecorder.isTypeSupported !== "function") return undefined;
  return ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find((t) => MediaRecorder.isTypeSupported(t));
}

/** Language code reported for a browser-recognized phrase. */
function phraseLanguage(hint?: ResponseLanguage): string {
  return hint === "en" ? "en" : "tl";
}

/**
 * Live captions of what the patient says, in English, Tagalog, Bisaya or a mix.
 * Also reports voice activity so the interview knows when the patient is
 * talking and when they have gone quiet.
 */
export function useLiveCaptions(stream: MediaStream | null, options: UseLiveCaptionsOptions = {}) {
  const [segments, setSegments] = useState<CaptionSegment[]>([]);
  const [turn, setTurn] = useState(0);
  const [interim, setInterim] = useState("");
  const [voiceActive, setVoiceActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [engine, setEngine] = useState<CaptionEngine>(() =>
    browserCaptionsAllowed() && getSpeechRecognition() ? "browser" : "whisper",
  );

  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  });
  const streamRef = useRef(stream);
  useEffect(() => {
    streamRef.current = stream;
  }, [stream]);

  const engineRef = useRef<CaptionEngine>(engine);
  const runningRef = useRef(false);
  const suspendedRef = useRef(false);
  const turnRef = useRef(0);
  const nextIdRef = useRef(1);

  // Voice activity (both engines).
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const segmenterRef = useRef(createPhraseSegmenter());
  const levelRef = useRef(0);
  const voiceActiveRef = useRef(false);
  const heardAtRef = useRef<number | null>(null);

  // Browser engine.
  const recognizerRef = useRef<SpeechRecognizer | null>(null);
  const quickEndsRef = useRef(0);
  const interimRef = useRef("");
  const interimSinceRef = useRef(0);

  // Whisper engine.
  const activeRef = useRef<ActiveRecorder | null>(null);
  const pendingRef = useRef(0);
  const heldSpeechRef = useRef(false);

  // ─── Shared ───

  const addPhrase = useCallback((text: string, phraseTurn: number, language: string) => {
    const id = nextIdRef.current++;
    setSegments((prev) => [...prev, { id, turn: phraseTurn, status: "done", text, language }]);
    optionsRef.current.onPhrase?.({ turn: phraseTurn, text, language });
  }, []);

  const setInterimText = (text: string) => {
    if (text !== interimRef.current) interimSinceRef.current = Date.now();
    interimRef.current = text;
    setInterim(text);
  };

  // ─── Browser engine ───

  const stopRecognizer = useCallback(() => {
    const recognizer = recognizerRef.current;
    recognizerRef.current = null;
    if (recognizer) {
      recognizer.onend = null;
      recognizer.onresult = null;
      recognizer.onerror = null;
      try {
        recognizer.abort();
      } catch {
        /* already stopped */
      }
    }
    interimRef.current = "";
    setInterim("");
  }, []);

  /** Turn shown-but-unfinished words into a phrase (before pausing / on a stall). */
  const commitInterim = useCallback(() => {
    const text = interimRef.current.trim();
    if (text) addPhrase(text, turnRef.current, phraseLanguage(optionsRef.current.languageHint));
    interimRef.current = "";
    setInterim("");
  }, [addPhrase]);

  const startRecorderRef = useRef<() => void>(() => {});
  // Latest startRecognizer, for restarts scheduled from recognizer callbacks.
  const startRecognizerRef = useRef<() => void>(() => {});

  const fallBackToWhisper = useCallback(
    (reason: string) => {
      stopRecognizer();
      engineRef.current = "whisper";
      setEngine("whisper");
      setError(`${reason} Using server captions instead — they appear after each phrase.`);
      if (runningRef.current && analyserRef.current) startRecorderRef.current();
    },
    [stopRecognizer],
  );

  const startRecognizer = useCallback(() => {
    if (recognizerRef.current || !runningRef.current || suspendedRef.current) return;
    const Recognition = getSpeechRecognition();
    if (!Recognition) {
      fallBackToWhisper("This browser has no live speech recognition.");
      return;
    }
    const recognizer = new Recognition();
    recognizer.lang = recognitionLocale(optionsRef.current.languageHint);
    recognizer.continuous = true;
    recognizer.interimResults = true;
    recognizer.maxAlternatives = 1;

    const startedAt = Date.now();
    recognizer.onresult = (e: SpeechResultEvent) => {
      heardAtRef.current = Date.now();
      quickEndsRef.current = 0;
      let pendingText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i];
        const text = (result[0]?.transcript ?? "").trim();
        if (!text) continue;
        if (result.isFinal) addPhrase(text, turnRef.current, phraseLanguage(optionsRef.current.languageHint));
        else pendingText = `${pendingText} ${text}`.trim();
      }
      setInterimText(pendingText);
    };
    recognizer.onerror = (e) => {
      if (FATAL_SPEECH_ERRORS.has(e.error)) fallBackToWhisper("Live speech recognition is unavailable here.");
      // "no-speech" / "aborted" are normal — onend restarts it.
    };
    recognizer.onend = () => {
      // Browsers end continuous recognition on their own now and then; keep it going.
      if (recognizerRef.current === recognizer) recognizerRef.current = null;
      if (!runningRef.current || suspendedRef.current || engineRef.current !== "browser") return;
      quickEndsRef.current = Date.now() - startedAt < QUICK_END_MS ? quickEndsRef.current + 1 : 0;
      if (quickEndsRef.current >= MAX_QUICK_ENDS) {
        fallBackToWhisper("Live speech recognition keeps stopping.");
        return;
      }
      setTimeout(() => startRecognizerRef.current(), 150);
    };

    recognizerRef.current = recognizer;
    try {
      recognizer.start();
    } catch {
      recognizerRef.current = null;
    }
  }, [addPhrase, fallBackToWhisper]);

  useEffect(() => {
    startRecognizerRef.current = startRecognizer;
  }, [startRecognizer]);

  // ─── Whisper engine ───

  const transcribe = useCallback((blob: Blob, phraseTurn: number) => {
    const id = nextIdRef.current++;
    pendingRef.current += 1;
    setSegments((prev) => [...prev, { id, turn: phraseTurn, status: "pending", text: "", language: "" }]);

    transcribeAudio(blob, {
      purpose: "caption",
      languageHint: optionsRef.current.languageHint,
      timeoutMs: WHISPER_TIMEOUT_MS,
    })
      .then((result) => {
        const text = (result.text || "").trim();
        if (EMPTY_RESULTS.has(text)) {
          setSegments((prev) => prev.filter((s) => s.id !== id));
          return;
        }
        const language = result.language || "";
        setSegments((prev) => prev.map((s) => (s.id === id ? { ...s, status: "done", text, language } : s)));
        optionsRef.current.onPhrase?.({ turn: phraseTurn, text, language });
      })
      .catch(() => {
        setSegments((prev) => prev.map((s) => (s.id === id ? { ...s, status: "failed" } : s)));
        setError("Captions couldn't reach the AI service — the interview continues, and you can use the buttons.");
      })
      .finally(() => {
        pendingRef.current -= 1;
      });
  }, []);

  const startRecorder = useCallback(() => {
    const tracks = streamRef.current?.getAudioTracks() ?? [];
    if (tracks.length === 0 || typeof MediaRecorder === "undefined") return;
    const mimeType = pickMimeType();
    const recorder = new MediaRecorder(new MediaStream(tracks), mimeType ? { mimeType } : undefined);
    const active: ActiveRecorder = { recorder, chunks: [], turn: turnRef.current };
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) active.chunks.push(e.data);
    };
    recorder.start(250);
    activeRef.current = active;
  }, []);

  useEffect(() => {
    startRecorderRef.current = startRecorder;
  }, [startRecorder]);

  /** End the current phrase recording (transcribing it or not) and optionally start the next. */
  const rotate = useCallback(
    (send: boolean, restart: boolean) => {
      const previous = activeRef.current;
      activeRef.current = null;
      if (restart) startRecorder();
      if (!previous) return;
      previous.recorder.onstop = () => {
        if (send && previous.chunks.length > 0) {
          transcribe(new Blob(previous.chunks, { type: previous.recorder.mimeType || "audio/webm" }), previous.turn);
        }
      };
      if (previous.recorder.state !== "inactive") previous.recorder.stop();
    },
    [startRecorder, transcribe],
  );

  // ─── Lifecycle ───

  const readLevel = (): number => (analyserRef.current ? readRms(analyserRef.current) : 0);

  /** Voice-activity analyser on the mic. Optional for the browser engine. */
  const setUpAnalyser = (): boolean => {
    const current = streamRef.current;
    if (!current || current.getAudioTracks().length === 0) return false;
    try {
      if (!ctxRef.current) {
        const ctx = new AudioContext();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 2048;
        const source = ctx.createMediaStreamSource(current);
        source.connect(analyser);
        ctxRef.current = ctx;
        analyserRef.current = analyser;
        sourceRef.current = source;
      }
      if (ctxRef.current.state === "suspended") ctxRef.current.resume().catch(() => {});
      return true;
    } catch {
      return false;
    }
  };

  const tick = () => {
    if (!runningRef.current) return;
    const now = Date.now();
    const level = readLevel();
    levelRef.current = level;
    const step = segmenterRef.current.feed(level, now);
    const heardRecently = heardAtRef.current !== null && now - heardAtRef.current < 600;
    const active = step.voiceActive || (engineRef.current === "browser" && heardRecently && !!interimRef.current);
    if (active !== voiceActiveRef.current) {
      voiceActiveRef.current = active;
      setVoiceActive(active);
    }

    if (engineRef.current === "browser") {
      if (interimRef.current && now - interimSinceRef.current > STALE_INTERIM_MS) {
        // The browser never finalized these words: keep them, and restart so
        // a late final result can't duplicate them.
        commitInterim();
        stopRecognizer();
        startRecognizerRef.current();
      }
      return;
    }

    // Whisper: one phrase in flight at a time. While the server is busy the
    // recording simply continues, so phrases merge instead of queueing up.
    const busy = pendingRef.current > 0;
    if (step.cut === "send" || (step.cut === "discard" && heldSpeechRef.current)) {
      if (busy) heldSpeechRef.current = true;
      else {
        heldSpeechRef.current = false;
        rotate(true, true);
      }
    } else if (step.cut === "discard") {
      if (!busy) rotate(false, true);
    } else if (heldSpeechRef.current && !busy && !step.voiceActive) {
      heldSpeechRef.current = false;
      rotate(true, true);
    }
  };
  const tickRef = useRef(tick);
  useEffect(() => {
    tickRef.current = tick;
  });

  const start = useCallback(() => {
    if (runningRef.current) return;
    const hasAnalyser = setUpAnalyser();
    if (engineRef.current === "whisper" && (!hasAnalyser || typeof MediaRecorder === "undefined")) {
      setError("Microphone isn't available — please use the buttons.");
      return;
    }
    runningRef.current = true;
    setRunning(true);
    segmenterRef.current.reset(Date.now());
    if (engineRef.current === "browser") startRecognizer();
    else startRecorder();
    intervalRef.current = setInterval(() => tickRef.current(), POLL_MS);
  }, [startRecognizer, startRecorder]);

  const stop = useCallback(() => {
    runningRef.current = false;
    setRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    stopRecognizer();
    rotate(false, false);
    heldSpeechRef.current = false;
    voiceActiveRef.current = false;
    setVoiceActive(false);
    levelRef.current = 0;
  }, [rotate, stopRecognizer]);

  /**
   * Pause while Amumata speaks. The browser engine listens through its own
   * microphone capture, so it must be stopped or it would caption her voice.
   */
  const suspend = useCallback(
    (on: boolean) => {
      suspendedRef.current = on;
      if (engineRef.current !== "browser") return;
      if (on) {
        commitInterim();
        stopRecognizer();
      } else if (runningRef.current) {
        startRecognizer();
      }
    },
    [commitInterim, startRecognizer, stopRecognizer],
  );

  /** Begin a new turn (question / prompt): fresh captions and silence clock. */
  const newTurn = useCallback((): number => {
    turnRef.current += 1;
    setTurn(turnRef.current);
    segmenterRef.current.reset(Date.now());
    heardAtRef.current = null;
    voiceActiveRef.current = false;
    setVoiceActive(false);
    heldSpeechRef.current = false;
    if (engineRef.current === "browser") {
      // Unfinished words belong to the previous turn — drop them.
      stopRecognizer();
      if (runningRef.current && !suspendedRef.current) startRecognizer();
    } else if (runningRef.current) {
      rotate(false, true);
    }
    return turnRef.current;
  }, [rotate, startRecognizer, stopRecognizer]);

  const getActivity = useCallback((): CaptionActivity => {
    const fromLevel = segmenterRef.current.lastVoiceAt;
    const fromSpeech = heardAtRef.current;
    const lastVoiceAt = fromLevel === null ? fromSpeech : fromSpeech === null ? fromLevel : Math.max(fromLevel, fromSpeech);
    const pending = engineRef.current === "browser" ? (interimRef.current ? 1 : 0) : pendingRef.current + (heldSpeechRef.current ? 1 : 0);
    return { lastVoiceAt, voiceActive: voiceActiveRef.current, pending };
  }, []);

  const getLevel = useCallback(() => levelRef.current, []);
  /** Current turn id, without waiting for a re-render. */
  const getTurn = useCallback(() => turnRef.current, []);

  useEffect(
    () => () => {
      runningRef.current = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
      const recognizer = recognizerRef.current;
      if (recognizer) {
        recognizer.onend = null;
        try {
          recognizer.abort();
        } catch {
          /* already stopped */
        }
      }
      const active = activeRef.current;
      if (active && active.recorder.state !== "inactive") {
        active.recorder.onstop = null;
        active.recorder.stop();
      }
      sourceRef.current?.disconnect();
      ctxRef.current?.close().catch(() => {});
    },
    [],
  );

  return {
    /** Final captions of the current turn, in speaking order. */
    turnSegments: segments.filter((s) => s.turn === turn),
    /** Words being spoken right now, not final yet (browser engine). */
    interim,
    engine,
    turn,
    voiceActive,
    running,
    error,
    start,
    stop,
    suspend,
    newTurn,
    getActivity,
    getLevel,
    getTurn,
  };
}
