import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTTS } from "../useTTS";

// Mock SpeechSynthesisUtterance
class MockUtterance {
  text: string;
  voice: SpeechSynthesisVoice | null = null;
  rate = 1;
  pitch = 1;
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: ((e: any) => void) | null = null;

  constructor(text: string) {
    this.text = text;
  }
}

// Mock speechSynthesis
const createMockSynthesis = () => ({
  speak: vi.fn((utterance: MockUtterance) => {
    // Simulate async speech
    setTimeout(() => {
      if (utterance.onstart) utterance.onstart();
      setTimeout(() => {
        if (utterance.onend) utterance.onend();
      }, 10);
    }, 5);
  }),
  cancel: vi.fn(),
  getVoices: vi.fn(() => [
    { name: "Microsoft Zira", lang: "en-US", default: false, localService: true, voiceURI: "zira" },
    { name: "Google UK English Female", lang: "en-GB", default: false, localService: false, voiceURI: "google-female" },
    { name: "Microsoft David", lang: "en-US", default: false, localService: true, voiceURI: "david" },
  ]),
  paused: false,
  pending: false,
  speaking: false,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
});

describe("useTTS", () => {
  let mockSynthesis: ReturnType<typeof createMockSynthesis>;

  beforeEach(() => {
    mockSynthesis = createMockSynthesis();
    (window as any).speechSynthesis = mockSynthesis;
    (window as any).SpeechSynthesisUtterance = MockUtterance;
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    delete (window as any).speechSynthesis;
    delete (window as any).SpeechSynthesisUtterance;
  });

  it("initializes with correct defaults", () => {
    const { result } = renderHook(() => useTTS());
    expect(result.current.isSpeaking).toBe(false);
    expect(result.current.isMuted).toBe(false);
    expect(result.current.isSupported).toBe(true);
  });

  it("speaks text and resolves when done", async () => {
    const { result } = renderHook(() => useTTS());

    let speakPromise: Promise<void>;
    act(() => {
      speakPromise = result.current.speak("Hello world");
    });

    // Advance timers to trigger onstart
    act(() => {
      vi.advanceTimersByTime(10);
    });
    expect(result.current.isSpeaking).toBe(true);

    // Advance timers to trigger onend
    act(() => {
      vi.advanceTimersByTime(20);
    });
    expect(result.current.isSpeaking).toBe(false);

    await speakPromise!;
  });

  it("does not speak when muted", async () => {
    const { result } = renderHook(() => useTTS());

    // Mute first
    act(() => {
      result.current.toggleMute();
    });
    expect(result.current.isMuted).toBe(true);

    await act(async () => {
      await result.current.speak("Hello");
    });

    // Should not have called speak on the synthesis
    expect(mockSynthesis.speak).not.toHaveBeenCalled();
    expect(result.current.isSpeaking).toBe(false);
  });

  it("stops current speech when muting", async () => {
    const { result } = renderHook(() => useTTS());

    // Start speaking
    let speakPromise: Promise<void>;
    act(() => {
      speakPromise = result.current.speak("Hello world");
    });
    act(() => {
      vi.advanceTimersByTime(10);
    });
    expect(result.current.isSpeaking).toBe(true);

    // Mute
    act(() => {
      result.current.toggleMute();
    });

    expect(mockSynthesis.cancel).toHaveBeenCalled();
    expect(result.current.isSpeaking).toBe(false);
    expect(result.current.isMuted).toBe(true);

    await speakPromise!;
  });

  it("stop() cancels speech and resolves pending promise", async () => {
    const { result } = renderHook(() => useTTS());

    let speakPromise: Promise<void>;
    act(() => {
      speakPromise = result.current.speak("Hello world");
    });
    act(() => {
      vi.advanceTimersByTime(10);
    });
    expect(result.current.isSpeaking).toBe(true);

    act(() => {
      result.current.stop();
    });

    expect(mockSynthesis.cancel).toHaveBeenCalled();
    expect(result.current.isSpeaking).toBe(false);

    await speakPromise!;
  });

  it("resolves on TTS error (fallback behavior)", async () => {
    // Make speak trigger an error
    mockSynthesis.speak.mockImplementation((utterance: MockUtterance) => {
      setTimeout(() => {
        if (utterance.onerror) utterance.onerror({ error: "synthesis-failed" });
      }, 5);
    });

    const { result } = renderHook(() => useTTS());

    let speakPromise: Promise<void>;
    act(() => {
      speakPromise = result.current.speak("Hello");
    });

    act(() => {
      vi.advanceTimersByTime(10);
    });

    // Should resolve (not hang)
    await speakPromise!;
    expect(result.current.isSpeaking).toBe(false);
  });

  it("resolves immediately for empty text", async () => {
    const { result } = renderHook(() => useTTS());

    await act(async () => {
      await result.current.speak("");
    });

    expect(mockSynthesis.speak).not.toHaveBeenCalled();
  });

  it("selects preferred voice (Microsoft Zira first)", async () => {
    const { result } = renderHook(() => useTTS());

    let speakPromise: Promise<void>;
    act(() => {
      speakPromise = result.current.speak("Hello");
    });

    // Check the utterance was created with the right voice
    const speakCall = mockSynthesis.speak.mock.calls[0][0] as MockUtterance;
    expect(speakCall.voice?.name).toBe("Microsoft Zira");
    expect(speakCall.rate).toBe(0.9);
    expect(speakCall.pitch).toBe(1.1);

    act(() => {
      vi.advanceTimersByTime(20);
    });
    await speakPromise!;
  });

  it("toggleMute() switches between muted and unmuted", () => {
    const { result } = renderHook(() => useTTS());

    expect(result.current.isMuted).toBe(false);

    act(() => {
      result.current.toggleMute();
    });
    expect(result.current.isMuted).toBe(true);

    act(() => {
      result.current.toggleMute();
    });
    expect(result.current.isMuted).toBe(false);
  });

  it("reports isSupported correctly", () => {
    const { result } = renderHook(() => useTTS());
    expect(result.current.isSupported).toBe(true);

    // Without speechSynthesis
    delete (window as any).speechSynthesis;
    const { result: result2 } = renderHook(() => useTTS());
    expect(result2.current.isSupported).toBe(false);
  });

  it("keeps speak/stop identity stable across re-renders", () => {
    // Root cause of the flicker: if the returned functions change identity every
    // render, any useEffect depending on them re-fires every render. The stable
    // ones must not.
    const { result, rerender } = renderHook(() => useTTS());
    const speakFirst = result.current.speak;
    const stopFirst = result.current.stop;

    rerender();
    rerender();

    expect(result.current.speak).toBe(speakFirst);
    expect(result.current.stop).toBe(stopFirst);
  });

  it("speaks at the normal pace by default and slower when asked", () => {
    const { result, rerender } = renderHook(({ rate }) => useTTS({ rate }), {
      initialProps: { rate: undefined as number | undefined },
    });
    act(() => void result.current.speak("Hello"));
    expect(mockSynthesis.speak.mock.calls[0][0].rate).toBe(0.9);

    rerender({ rate: 0.7 });
    act(() => void result.current.speak("Hello again"));
    expect(mockSynthesis.speak.mock.calls[1][0].rate).toBe(0.7);
  });

  it("knows whether the device has a Filipino voice (fil-PH or tl-PH)", () => {
    const { result } = renderHook(() => useTTS());
    expect(result.current.hasVoiceFor("en-US")).toBe(true);
    expect(result.current.hasVoiceFor("fil-PH")).toBe(false); // only English voices installed

    mockSynthesis.getVoices.mockReturnValue([
      ...mockSynthesis.getVoices(),
      { name: "Google Filipino", lang: "tl_PH", default: false, localService: false, voiceURI: "google-tl" },
    ]);
    expect(result.current.hasVoiceFor("fil-PH")).toBe(true);
  });

  it("assumes a voice exists while the voice list is still loading", () => {
    mockSynthesis.getVoices.mockReturnValue([]);
    const { result } = renderHook(() => useTTS());
    expect(result.current.hasVoiceFor("fil-PH")).toBe(true);
  });

  it("uses a Tagalog-labelled voice for Filipino speech", () => {
    const tagalog = { name: "Google Filipino", lang: "tl-PH", default: false, localService: false, voiceURI: "google-tl" };
    mockSynthesis.getVoices.mockReturnValue([...mockSynthesis.getVoices(), tagalog]);
    const { result } = renderHook(() => useTTS());
    act(() => void result.current.speak("Kumusta ka?", "fil-PH"));
    expect(mockSynthesis.speak.mock.calls[0][0].voice).toBe(tagalog);
  });
});
