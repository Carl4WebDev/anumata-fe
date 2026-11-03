import { useEffect, useRef, useState, type RefObject } from "react";
import type { FaceDetector } from "@mediapipe/tasks-vision";
import { assessFace, createFaceHintTracker, FACE_DARK, type FaceProblem } from "./faceCheck";
import type { FaceSighting } from "./postureCheck";

/**
 * Runs a face detector on the camera preview, on the patient's own device
 * (nothing is sent anywhere), and returns a steady hint when their face isn't
 * visible enough — or null.
 *
 * The detector (MediaPipe, ~13 MB WASM served from our own site, see
 * scripts/copy-mediapipe.mjs) is downloaded only once the conversation starts,
 * and once per page. If the device can't run it, there are simply no hints.
 */

const CHECK_MS = 1000;
const ASSETS = `${import.meta.env.BASE_URL}mediapipe`;

let detectorPromise: Promise<FaceDetector | null> | null = null;

function loadDetector(): Promise<FaceDetector | null> {
  detectorPromise ??= (async () => {
    try {
      const { FaceDetector, FilesetResolver } = await import("@mediapipe/tasks-vision");
      const fileset = await FilesetResolver.forVisionTasks(`${ASSETS}/wasm`);
      return await FaceDetector.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: `${ASSETS}/blaze_face_short_range.tflite`, delegate: "CPU" },
        runningMode: "VIDEO",
        // Report weak detections too; assessFace decides what counts.
        minDetectionConfidence: 0.3,
      });
    } catch (err) {
      console.warn("[face-check] Face detector unavailable on this device:", err);
      return null;
    }
  })();
  return detectorPromise;
}

/** Average brightness (0–1) of a tiny copy of the frame, or null if it can't be measured. */
function measureBrightness(video: HTMLVideoElement, canvas: HTMLCanvasElement): number | null {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  try {
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let sum = 0;
    for (let i = 0; i < data.length; i += 4) sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    return sum / (data.length / 4) / 255;
  } catch {
    return null;
  }
}

/** The most confident face in a detection result, as fractions of the frame (for the posture tracker). */
function sightingOf(
  detections: { boundingBox?: { originY: number; height: number }; keypoints?: { x: number; y: number }[]; categories: { score: number }[] }[],
  frameHeight: number,
): FaceSighting | null {
  const best = [...detections].sort((a, b) => (b.categories[0]?.score ?? 0) - (a.categories[0]?.score ?? 0))[0];
  if (!best?.boundingBox || (best.categories[0]?.score ?? 0) < 0.5 || !frameHeight) return null;
  const { originY, height } = best.boundingBox;
  return { cy: (originY + height / 2) / frameHeight, height: height / frameHeight, points: best.keypoints ?? [] };
}

/**
 * `onSighting` (optional): called once a second with where the face is (null
 * when none is seen) and whether the picture is bright enough to trust that —
 * the interview room uses it to notice a head going down or a blank stare.
 */
export function useFaceCheck(
  videoRef: RefObject<HTMLVideoElement | null>,
  active: boolean,
  onSighting?: (sighting: FaceSighting | null, usable: boolean) => void,
): FaceProblem | null {
  const [hint, setHint] = useState<FaceProblem | null>(null);
  const onSightingRef = useRef(onSighting);
  useEffect(() => {
    onSightingRef.current = onSighting;
  });

  useEffect(() => {
    if (!active) {
      setHint(null);
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;
    const tracker = createFaceHintTracker();
    const canvas = document.createElement("canvas");
    canvas.width = 32;
    canvas.height = 24;

    void loadDetector().then((detector) => {
      if (cancelled || !detector) return;
      timer = setInterval(() => {
        const video = videoRef.current;
        if (!video || video.readyState < 2 || !video.videoWidth) return;
        let faces: { width: number; score: number }[];
        let sighting: FaceSighting | null;
        try {
          const { detections } = detector.detectForVideo(video, performance.now());
          faces = detections.map((d) => ({
            width: (d.boundingBox?.width ?? 0) / video.videoWidth,
            score: d.categories[0]?.score ?? 0,
          }));
          sighting = sightingOf(detections, video.videoHeight);
        } catch {
          return; // a frame the detector couldn't read — try again next second
        }
        const brightness = measureBrightness(video, canvas);
        setHint(tracker.feed(assessFace({ faces, brightness })));
        onSightingRef.current?.(sighting, brightness === null || brightness >= FACE_DARK);
      }, CHECK_MS);
    });

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
      setHint(null);
    };
  }, [active, videoRef]);

  return hint;
}
