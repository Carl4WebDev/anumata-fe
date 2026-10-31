import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useLiveCaptions } from "../useLiveCaptions";
import type { SpeechResultEvent } from "../browserSpeech";

vi.mock("../../../../shared/api/sttApi", () => ({ transcribeAudio: vi.fn() }));

/** Fake browser speech recognizer; each instance is recorded. */
class FakeRecognizer {
  static instances: FakeRecognizer[] = [];
  lang = "";
  continuous = false;
  interimResults = false;
  maxAlternatives = 1;
  started = false;
  aborted = false;
  onresult: ((e: SpeechResultEvent) => void) | null = null;
  onerror: ((e: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  constructor() {
    FakeRecognizer.instances.push(this);
  }
  start() {
    this.started = true;
  }
  stop() {
    this.onend?.();
  }
  abort() {
    this.aborted = true;
  }
  /** Simulate words: [text, isFinal][] from resultIndex 0. */
  emit(results: [string, boolean][]) {
    const list = results.map(([text, isFinal]) => Object.assign([{ transcript: text }], { isFinal }));
    this.onresult?.({ resultIndex: 0, results: list as unknown as SpeechResultEvent["results"] });
  }
}

const latest = () => FakeRecognizer.instances[FakeRecognizer.instances.length - 1];
const stream = { getAudioTracks: () => [{}] } as unknown as MediaStream;

beforeEach(() => {
  FakeRecognizer.instances = [];
  vi.stubGlobal("webkitSpeechRecognition", FakeRecognizer);
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("useLiveCaptions — browser engine (instant words)", () => {
  test("shows words while speaking and makes them a phrase when final", () => {
    const onPhrase = vi.fn();
    const { result } = renderHook(() => useLiveCaptions(stream, { onPhrase }));
    expect(result.current.engine).toBe("browser");

    act(() => {
      result.current.newTurn();
      result.current.start();
    });
    const recognizer = latest();
    expect(recognizer.started).toBe(true);
    expect(recognizer.lang).toBe("fil-PH"); // Filipino until the patient is known to speak English
    expect(recognizer.interimResults).toBe(true);

    act(() => recognizer.emit([["medyo pagod", false]]));
    expect(result.current.interim).toBe("medyo pagod");
    expect(result.current.getActivity().pending).toBe(1); // not final yet — the turn must wait

    act(() => recognizer.emit([["medyo pagod ako ngayon", true]]));
    expect(result.current.interim).toBe("");
    expect(result.current.turnSegments.map((s) => s.text)).toEqual(["medyo pagod ako ngayon"]);
    expect(onPhrase).toHaveBeenCalledWith({ turn: 1, text: "medyo pagod ako ngayon", language: "tl" });
    expect(result.current.getActivity().lastVoiceAt).not.toBeNull();
  });

  test("pauses while Amumata speaks, keeping words already heard", () => {
    const onPhrase = vi.fn();
    const { result } = renderHook(() => useLiveCaptions(stream, { onPhrase }));
    act(() => result.current.start());
    const first = latest();
    act(() => first.emit([["okay lang", false]]));

    act(() => result.current.suspend(true));
    expect(first.aborted).toBe(true);
    expect(onPhrase).toHaveBeenCalledWith(expect.objectContaining({ text: "okay lang" }));

    act(() => result.current.suspend(false));
    expect(latest()).not.toBe(first);
    expect(latest().started).toBe(true);
  });

  test("restarts on its own when the browser ends recognition", () => {
    const { result } = renderHook(() => useLiveCaptions(stream));
    act(() => result.current.start());
    const first = latest();
    act(() => {
      first.onend?.();
      vi.advanceTimersByTime(200);
    });
    expect(FakeRecognizer.instances).toHaveLength(2);
    expect(latest().started).toBe(true);
  });

  test("uses English recognition once the patient is known to speak English", () => {
    const { result } = renderHook(() => useLiveCaptions(stream, { languageHint: "en" }));
    act(() => result.current.start());
    expect(latest().lang).toBe("en-US");
  });

  test("words never finalized by the browser are kept after a stall", () => {
    const onPhrase = vi.fn();
    const { result } = renderHook(() => useLiveCaptions(stream, { onPhrase }));
    act(() => result.current.start());
    act(() => latest().emit([["hindi ako makatulog", false]]));
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(onPhrase).toHaveBeenCalledWith(expect.objectContaining({ text: "hindi ako makatulog" }));
    expect(result.current.interim).toBe("");
  });

  test("a new turn drops unfinished words and old captions", () => {
    const { result } = renderHook(() => useLiveCaptions(stream));
    act(() => {
      result.current.newTurn();
      result.current.start();
    });
    act(() => latest().emit([["first answer", true]]));
    act(() => latest().emit([["half a", false]]));
    act(() => {
      result.current.newTurn();
    });
    expect(result.current.interim).toBe("");
    expect(result.current.turnSegments).toEqual([]);
  });

  test("a recognizer that keeps dying instantly switches to server captions (no restart storm)", () => {
    const { result } = renderHook(() => useLiveCaptions(stream));
    act(() => result.current.start());
    for (let i = 0; i < 5; i++) {
      act(() => {
        latest().onend?.();
        vi.advanceTimersByTime(200);
      });
    }
    expect(result.current.engine).toBe("whisper");
    expect(FakeRecognizer.instances.length).toBeLessThanOrEqual(5);
  });

  test("falls back to server captions when the browser blocks recognition", () => {
    const { result } = renderHook(() => useLiveCaptions(stream));
    act(() => result.current.start());
    act(() => latest().onerror?.({ error: "not-allowed" }));
    expect(result.current.engine).toBe("whisper");
    expect(result.current.error).toMatch(/server captions/);
  });
});

describe("useLiveCaptions — no browser recognition", () => {
  test("uses server (Whisper) captions", () => {
    vi.unstubAllGlobals();
    const { result } = renderHook(() => useLiveCaptions(stream));
    expect(result.current.engine).toBe("whisper");
  });

  test("server captions send one phrase at a time — later speech waits instead of queueing", async () => {
    vi.unstubAllGlobals();
    const { transcribeAudio } = await import("../../../../shared/api/sttApi");
    const resolvers: ((v: { text: string; language: string }) => void)[] = [];
    vi.mocked(transcribeAudio).mockImplementation(
      () => new Promise((resolve) => resolvers.push(resolve as (v: { text: string; language: string }) => void)) as never,
    );

    let level = 0;
    vi.stubGlobal(
      "AudioContext",
      class {
        state = "running";
        createAnalyser() {
          return {
            fftSize: 32,
            getByteTimeDomainData: (data: Uint8Array) => data.fill(128 + Math.round(level * 127)),
          };
        }
        createMediaStreamSource() {
          return { connect() {}, disconnect() {} };
        }
        close() {
          return Promise.resolve();
        }
      },
    );
    vi.stubGlobal(
      "MediaRecorder",
      class {
        state = "inactive";
        mimeType = "audio/webm";
        ondataavailable: ((e: { data: Blob }) => void) | null = null;
        onstop: (() => void) | null = null;
        start() {
          this.state = "recording";
        }
        stop() {
          this.state = "inactive";
          this.ondataavailable?.({ data: new Blob(["x"]) });
          this.onstop?.();
        }
      },
    );
    vi.stubGlobal("MediaStream", class {});

    const onPhrase = vi.fn();
    const { result } = renderHook(() => useLiveCaptions(stream, { onPhrase }));
    act(() => result.current.start());

    const speakThenPause = () =>
      act(() => {
        level = 0.3;
        vi.advanceTimersByTime(1000);
        level = 0;
        vi.advanceTimersByTime(1000);
      });

    speakThenPause();
    expect(transcribeAudio).toHaveBeenCalledTimes(1);
    speakThenPause(); // server still busy with phrase 1
    speakThenPause();
    expect(transcribeAudio).toHaveBeenCalledTimes(1); // held, not queued
    expect(result.current.getActivity().pending).toBeGreaterThan(0);

    await act(async () => {
      resolvers[0]({ text: "first phrase", language: "tl" });
      // Flushes the reply's then/finally microtasks, then the next ticks.
      await vi.advanceTimersByTimeAsync(300);
    });
    expect(onPhrase).toHaveBeenCalledWith(expect.objectContaining({ text: "first phrase" }));
    expect(transcribeAudio).toHaveBeenCalledTimes(2); // the held speech goes as one merged phrase
  });
});
