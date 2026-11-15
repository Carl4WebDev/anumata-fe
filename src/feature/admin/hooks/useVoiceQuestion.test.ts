import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useVoiceQuestion } from "./useVoiceQuestion";

const stt = vi.hoisted(() => ({ transcribeAudio: vi.fn() }));
vi.mock("../../../shared/api/sttApi", () => stt);

class FakeRecognizer {
  static last: FakeRecognizer | null = null;
  lang = "";
  continuous = true;
  interimResults = false;
  maxAlternatives = 0;
  onresult: ((e: unknown) => void) | null = null;
  onerror: ((e: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  start = vi.fn();
  stop = vi.fn(() => this.onend?.());
  abort = vi.fn();
  constructor() {
    FakeRecognizer.last = this;
  }
  say(text: string) {
    this.onresult?.({ resultIndex: 0, results: { length: 1, 0: { isFinal: true, length: 1, 0: { transcript: text } } } });
  }
}

class FakeRecorder {
  static last: FakeRecorder | null = null;
  state = "inactive";
  mimeType = "audio/webm";
  stream: { getTracks: () => { stop: () => void }[] };
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  constructor(stream: FakeRecorder["stream"]) {
    this.stream = stream;
    FakeRecorder.last = this;
  }
  start() {
    this.state = "recording";
  }
  stop() {
    this.state = "inactive";
    this.ondataavailable?.({ data: new Blob(["audio"]) });
    this.onstop?.();
  }
}

const track = { stop: vi.fn() };
const getUserMedia = vi.fn(async () => ({ getTracks: () => [track] }));

beforeEach(() => {
  FakeRecognizer.last = null;
  FakeRecorder.last = null;
  stt.transcribeAudio.mockReset();
  getUserMedia.mockClear();
  vi.stubGlobal("MediaRecorder", FakeRecorder);
  Object.defineProperty(navigator, "mediaDevices", { value: { getUserMedia }, configurable: true });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("useVoiceQuestion", () => {
  test("browser speech recognition, in English, fills in the words as they're spoken", () => {
    vi.stubGlobal("webkitSpeechRecognition", FakeRecognizer);
    const onText = vi.fn();
    const { result } = renderHook(() => useVoiceQuestion(onText));

    act(() => result.current.start());
    expect(FakeRecognizer.last?.lang).toBe("en-US");
    expect(result.current.mode).toBe("listening");

    act(() => FakeRecognizer.last?.say("how is privacy protected"));
    expect(onText).toHaveBeenCalledWith("how is privacy protected");

    act(() => result.current.stop());
    expect(result.current.mode).toBe("idle");
  });

  test("where the browser can't recognise speech (e.g. Brave), it records and uses Whisper instead", async () => {
    vi.stubGlobal("webkitSpeechRecognition", FakeRecognizer);
    stt.transcribeAudio.mockResolvedValue({ text: " What is fusion? " });
    const onText = vi.fn();
    const { result } = renderHook(() => useVoiceQuestion(onText));

    act(() => result.current.start());
    act(() => FakeRecognizer.last?.onerror?.({ error: "network" }));
    await waitFor(() => expect(result.current.mode).toBe("recording"));

    act(() => result.current.stop());
    await waitFor(() => expect(onText).toHaveBeenCalledWith("What is fusion?"));
    expect(stt.transcribeAudio.mock.calls[0][1]).toMatchObject({ languageHint: "en" });
    expect(track.stop).toHaveBeenCalled();
    expect(result.current.mode).toBe("idle");
  });

  test("no words back for a while also switches to Whisper", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("webkitSpeechRecognition", FakeRecognizer);
    const { result } = renderHook(() => useVoiceQuestion(vi.fn()));

    act(() => result.current.start());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(7000);
    });
    expect(FakeRecognizer.last?.abort).toHaveBeenCalled();
    expect(getUserMedia).toHaveBeenCalled();
    expect(result.current.mode).toBe("recording");
  });

  test("a blocked microphone gives a clear message", async () => {
    getUserMedia.mockRejectedValueOnce(new Error("denied"));
    const { result } = renderHook(() => useVoiceQuestion(vi.fn()));

    act(() => result.current.start());
    await waitFor(() => expect(result.current.error).toMatch(/microphone isn't available/));
    expect(result.current.mode).toBe("idle");
  });
});
