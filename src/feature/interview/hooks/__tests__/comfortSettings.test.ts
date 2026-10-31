import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useComfortSettings, NORMAL_VOICE_RATE, SLOW_VOICE_RATE } from "../comfortSettings";

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe("useComfortSettings", () => {
  test("starts with normal text and voice", () => {
    const { result } = renderHook(() => useComfortSettings());
    expect(result.current.largeText).toBe(false);
    expect(result.current.slowVoice).toBe(false);
    expect(result.current.voiceRate).toBe(NORMAL_VOICE_RATE);
  });

  test("toggles larger text and a slower voice", () => {
    const { result } = renderHook(() => useComfortSettings());
    act(() => result.current.toggleLargeText());
    act(() => result.current.toggleSlowVoice());
    expect(result.current.largeText).toBe(true);
    expect(result.current.slowVoice).toBe(true);
    expect(result.current.voiceRate).toBe(SLOW_VOICE_RATE);
  });

  test("remembers the choice next time on this device", () => {
    const first = renderHook(() => useComfortSettings());
    act(() => first.result.current.toggleLargeText());
    first.unmount();

    const { result } = renderHook(() => useComfortSettings());
    expect(result.current.largeText).toBe(true);
    expect(result.current.slowVoice).toBe(false);
  });

  test("still works when the browser blocks storage (private mode)", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const { result } = renderHook(() => useComfortSettings());
    act(() => result.current.toggleSlowVoice());
    expect(result.current.slowVoice).toBe(true);
  });
});
