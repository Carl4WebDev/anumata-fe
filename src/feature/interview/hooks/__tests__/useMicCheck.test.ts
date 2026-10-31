import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useMicCheck, MIC_SILENT_HINT_MS } from "../useMicCheck";

/** Fake Web Audio: the analyser reports whatever `room.level` is (as RMS). */
const room = { level: 0, closed: 0 };
class FakeAnalyser {
  fftSize = 2048;
  getByteTimeDomainData(data: Uint8Array) {
    // Alternate around the 128 midpoint so the RMS equals room.level.
    const amp = Math.round(room.level * 128);
    for (let i = 0; i < data.length; i++) data[i] = 128 + (i % 2 === 0 ? amp : -amp);
  }
}
class FakeAudioContext {
  state = "running";
  createAnalyser() {
    return new FakeAnalyser();
  }
  createMediaStreamSource() {
    return { connect: vi.fn(), disconnect: vi.fn() };
  }
  resume() {
    return Promise.resolve();
  }
  close() {
    room.closed += 1;
    return Promise.resolve();
  }
}

const streamWithMic = { getAudioTracks: () => [{}] } as unknown as MediaStream;
const advance = (ms: number) => act(async () => void (await vi.advanceTimersByTimeAsync(ms)));

beforeEach(() => {
  vi.useFakeTimers();
  room.level = 0;
  room.closed = 0;
  vi.stubGlobal("AudioContext", FakeAudioContext);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("useMicCheck", () => {
  test("listens first, then confirms once the patient's voice is heard", async () => {
    const { result } = renderHook(() => useMicCheck(streamWithMic, true));
    expect(result.current.status).toBe("listening");

    room.level = 0.1; // "hello"
    await advance(600);
    expect(result.current.status).toBe("heard");
    expect(result.current.getLevel()).toBeGreaterThan(0.05);
  });

  test("a short click or background noise isn't enough", async () => {
    const { result } = renderHook(() => useMicCheck(streamWithMic, true));
    room.level = 0.1;
    await advance(100);
    room.level = 0.005;
    await advance(1000);
    expect(result.current.status).toBe("listening");
  });

  test("hints that the mic may be wrong after a while of silence", async () => {
    const { result } = renderHook(() => useMicCheck(streamWithMic, true));
    await advance(MIC_SILENT_HINT_MS + 200);
    expect(result.current.status).toBe("silent");

    room.level = 0.1; // they fix it and speak
    await advance(600);
    expect(result.current.status).toBe("heard");
  });

  test("reports when there's no microphone to test", () => {
    const noMic = { getAudioTracks: () => [] } as unknown as MediaStream;
    const { result } = renderHook(() => useMicCheck(noMic, true));
    expect(result.current.status).toBe("unavailable");
  });

  test("stops listening (and frees the audio) when no longer needed", async () => {
    const { rerender } = renderHook(({ active }) => useMicCheck(streamWithMic, active), { initialProps: { active: true } });
    rerender({ active: false });
    expect(room.closed).toBe(1);
  });
});
