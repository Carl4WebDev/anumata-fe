import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSpeechRecognition } from "../useSpeechRecognition";

// Minimal mock of the Web Speech API SpeechRecognition.
class MockRecognition {
  static instances: MockRecognition[] = [];
  continuous = false;
  interimResults = false;
  lang = "";
  onstart: (() => void) | null = null;
  onresult: ((e: any) => void) | null = null;
  onend: (() => void) | null = null;
  onerror: ((e: any) => void) | null = null;
  started = false;
  stopped = false;
  aborted = false;

  constructor() {
    MockRecognition.instances.push(this);
  }
  start() {
    this.started = true;
    this.onstart?.();
  }
  stop() {
    this.stopped = true;
  }
  abort() {
    this.aborted = true;
    this.onend?.();
  }
  // Test helpers
  emitFinal(text: string) {
    this.onresult?.({ resultIndex: 0, results: [{ isFinal: true, 0: { transcript: text } }] });
    this.onend?.();
  }
  emitInterim(text: string) {
    this.onresult?.({ resultIndex: 0, results: [{ isFinal: false, 0: { transcript: text } }] });
  }
  emitError(error: string) {
    this.onerror?.({ error });
  }
  emitEnd() {
    this.onend?.();
  }
}

describe("useSpeechRecognition", () => {
  beforeEach(() => {
    MockRecognition.instances = [];
    (window as any).SpeechRecognition = MockRecognition;
    delete (window as any).webkitSpeechRecognition;
  });

  afterEach(() => {
    delete (window as any).SpeechRecognition;
    vi.restoreAllMocks();
  });

  it("reports supported when SpeechRecognition exists", () => {
    const { result } = renderHook(() => useSpeechRecognition());
    expect(result.current.isSupported).toBe(true);
    expect(result.current.status).toBe("idle");
  });

  it("reports supported via webkitSpeechRecognition", () => {
    delete (window as any).SpeechRecognition;
    (window as any).webkitSpeechRecognition = MockRecognition;
    const { result } = renderHook(() => useSpeechRecognition());
    expect(result.current.isSupported).toBe(true);
  });

  it("reports unsupported when neither API exists", () => {
    delete (window as any).SpeechRecognition;
    const { result } = renderHook(() => useSpeechRecognition());
    expect(result.current.isSupported).toBe(false);
  });

  it("start() begins listening and sets status", () => {
    const { result } = renderHook(() => useSpeechRecognition());
    act(() => result.current.start());
    expect(result.current.status).toBe("listening");
    expect(MockRecognition.instances[0].started).toBe(true);
  });

  it("captures a final transcript then goes idle", () => {
    const { result } = renderHook(() => useSpeechRecognition());
    act(() => result.current.start());
    act(() => MockRecognition.instances[0].emitFinal("I am doing well"));
    expect(result.current.transcript).toBe("I am doing well");
    expect(result.current.status).toBe("idle");
  });

  it("shows interim transcript while listening", () => {
    const { result } = renderHook(() => useSpeechRecognition());
    act(() => result.current.start());
    act(() => MockRecognition.instances[0].emitInterim("partial wor"));
    expect(result.current.interimTranscript).toBe("partial wor");
  });

  it("errors on empty speech, never invents a transcript", () => {
    const { result } = renderHook(() => useSpeechRecognition());
    act(() => result.current.start());
    // Recognizer ends with no captured result.
    act(() => MockRecognition.instances[0].emitEnd());
    expect(result.current.transcript).toBe("");
    expect(result.current.status).toBe("error");
    expect(result.current.error).toContain("Didn't catch that");
  });

  it("handles microphone permission denial", () => {
    const { result } = renderHook(() => useSpeechRecognition());
    act(() => result.current.start());
    act(() => MockRecognition.instances[0].emitError("not-allowed"));
    expect(result.current.status).toBe("error");
    expect(result.current.error).toContain("denied");
  });

  it("treats 'aborted' as non-error (deliberate stop)", () => {
    const { result } = renderHook(() => useSpeechRecognition());
    act(() => result.current.start());
    act(() => MockRecognition.instances[0].emitError("aborted"));
    expect(result.current.status).toBe("listening"); // unchanged, no error set
  });

  it("stop() sets processing and calls recognizer stop", () => {
    const { result } = renderHook(() => useSpeechRecognition());
    act(() => result.current.start());
    const rec = MockRecognition.instances[0];
    act(() => result.current.stop());
    expect(rec.stopped).toBe(true);
    expect(result.current.status).toBe("processing");
  });

  it("abort() stops recognition and resets status", () => {
    const { result } = renderHook(() => useSpeechRecognition());
    act(() => result.current.start());
    const rec = MockRecognition.instances[0];
    act(() => result.current.abort());
    expect(rec.aborted).toBe(true);
    expect(result.current.status).toBe("idle");
  });

  it("reset() clears transcript and error", () => {
    const { result } = renderHook(() => useSpeechRecognition());
    act(() => result.current.start());
    act(() => MockRecognition.instances[0].emitFinal("hello"));
    act(() => result.current.reset());
    expect(result.current.transcript).toBe("");
    expect(result.current.error).toBe("");
    expect(result.current.status).toBe("idle");
  });

  it("abort() on unmount stops active recognition", () => {
    const { result, unmount } = renderHook(() => useSpeechRecognition());
    act(() => result.current.start());
    const rec = MockRecognition.instances[0];
    unmount();
    expect(rec.aborted).toBe(true);
  });

  it("start() after a previous session tears down the old recognizer", () => {
    const { result } = renderHook(() => useSpeechRecognition());
    act(() => result.current.start());
    const first = MockRecognition.instances[0];
    act(() => result.current.start());
    expect(first.aborted).toBe(true);
    expect(MockRecognition.instances.length).toBe(2);
  });

  it("accumulates multiple final segments", () => {
    const { result } = renderHook(() => useSpeechRecognition());
    act(() => result.current.start());
    const rec = MockRecognition.instances[0];
    act(() =>
      rec.onresult?.({ resultIndex: 0, results: [{ isFinal: true, 0: { transcript: "hello" } }] })
    );
    act(() =>
      rec.onresult?.({ resultIndex: 0, results: [{ isFinal: true, 0: { transcript: "there" } }] })
    );
    expect(result.current.transcript).toBe("hello there");
    act(() => rec.emitEnd());
    expect(result.current.status).toBe("idle");
  });
});
