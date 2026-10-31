import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

/** What the fake detector "sees": face boxes in pixels (frame is 640 wide). */
const camera = { faces: [] as { width: number; score: number }[], fail: false };
const createFromOptions = vi.fn();

vi.mock("@mediapipe/tasks-vision", () => ({
  FilesetResolver: { forVisionTasks: vi.fn(async (path: string) => ({ path })) },
  FaceDetector: {
    createFromOptions: (...args: unknown[]) => createFromOptions(...args),
  },
}));

const video = { readyState: 4, videoWidth: 640, videoHeight: 480 } as unknown as HTMLVideoElement;
const videoRef = { current: video };
const advance = (ms: number) => act(async () => void (await vi.advanceTimersByTimeAsync(ms)));

beforeEach(async () => {
  vi.useFakeTimers();
  vi.resetModules(); // the detector is loaded once per page: start fresh each test
  camera.faces = [];
  camera.fail = false;
  createFromOptions.mockReset().mockImplementation(async () => {
    if (camera.fail) throw new Error("WebAssembly not supported");
    return {
      detectForVideo: () => ({
        detections: camera.faces.map((f) => ({ boundingBox: { originX: 0, originY: 0, width: f.width, height: f.width }, categories: [{ score: f.score }] })),
      }),
      close: vi.fn(),
    };
  });
});
afterEach(() => vi.useRealTimers());

async function load() {
  return (await import("../useFaceCheck")).useFaceCheck;
}

describe("useFaceCheck", () => {
  test("no hint while the face is clearly visible", async () => {
    const useFaceCheck = await load();
    camera.faces = [{ width: 200, score: 0.9 }];
    const { result } = renderHook(() => useFaceCheck(videoRef, true));
    await advance(5000);
    expect(result.current).toBeNull();
  });

  test("asks the patient to face the camera after a few seconds without a face", async () => {
    const useFaceCheck = await load();
    const { result } = renderHook(() => useFaceCheck(videoRef, true));
    await advance(1500);
    expect(result.current).toBeNull(); // not straight away
    await advance(3000);
    expect(result.current).toBe("no_face");

    camera.faces = [{ width: 200, score: 0.9 }];
    await advance(2500);
    expect(result.current).toBeNull();
  });

  test("a small face → 'move closer'", async () => {
    const useFaceCheck = await load();
    camera.faces = [{ width: 40, score: 0.9 }];
    const { result } = renderHook(() => useFaceCheck(videoRef, true));
    await advance(4500);
    expect(result.current).toBe("too_far");
  });

  test("loads the detector from our own site, only once", async () => {
    const useFaceCheck = await load();
    const { rerender } = renderHook(({ active }) => useFaceCheck(videoRef, active), { initialProps: { active: true } });
    await advance(10);
    rerender({ active: false });
    rerender({ active: true });
    await advance(10);
    expect(createFromOptions).toHaveBeenCalledTimes(1);
    const [fileset, options] = createFromOptions.mock.calls[0];
    expect(fileset.path).toMatch(/\/mediapipe\/wasm$/);
    expect(options.baseOptions.modelAssetPath).toMatch(/\/mediapipe\/blaze_face_short_range\.tflite$/);
  });

  test("stops checking (and clears the hint) when not active, e.g. on a break", async () => {
    const useFaceCheck = await load();
    const { result, rerender } = renderHook(({ active }) => useFaceCheck(videoRef, active), { initialProps: { active: true } });
    await advance(4500);
    expect(result.current).toBe("no_face");
    rerender({ active: false });
    expect(result.current).toBeNull();
  });

  test("devices that can't run the detector simply get no hints", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    camera.fail = true;
    const useFaceCheck = await load();
    const { result } = renderHook(() => useFaceCheck(videoRef, true));
    await advance(5000);
    expect(result.current).toBeNull();
  });
});
