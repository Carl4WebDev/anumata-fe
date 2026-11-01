import type { LocalizedLine } from "./rapportUtils";

/**
 * Face-in-frame check: is the patient's face visible enough for the facial
 * emotion analysis? Pure decisions here; useFaceCheck runs the detector.
 */

export type FaceStatus = "ok" | "no_face" | "too_far" | "too_dark";
export type FaceProblem = Exclude<FaceStatus, "ok">;

export interface FaceObservation {
  /** Detected faces: width as a fraction of the frame width (0–1), detector confidence (0–1). */
  faces: { width: number; score: number }[];
  /** Average picture brightness (0–1), or null when it couldn't be measured. */
  brightness: number | null;
}

const MIN_SCORE = 0.5;
// The analysis needs a face ≥ 40 px in a 640 px frame (~6%); ask for closer well before that.
const MIN_FACE_WIDTH = 0.12;
// No face in a picture this dark → blame the light, not the patient.
const DARK = 0.2;
// Even with a face found, this dark hurts the analysis.
const VERY_DARK = 0.12;

export function assessFace({ faces, brightness }: FaceObservation): FaceStatus {
  const confident = faces.filter((f) => f.score >= MIN_SCORE);
  const dark = brightness !== null && brightness < DARK;
  if (confident.length === 0) return dark ? "too_dark" : "no_face";
  const largest = Math.max(...confident.map((f) => f.width));
  if (largest < MIN_FACE_WIDTH) return "too_far";
  if (brightness !== null && brightness < VERY_DARK) return "too_dark";
  return "ok";
}

// One check per second: a hint after ~3 s of the same problem, cleared after ~2 s fine.
export const PROBLEM_CHECKS = 3;
export const OK_CHECKS = 2;

/** Smooths per-check results into a steady hint (null = no hint). */
export function createFaceHintTracker() {
  let shown: FaceProblem | null = null;
  let candidate: FaceProblem | null = null;
  let problemRun = 0;
  let okRun = 0;

  return {
    feed(status: FaceStatus): FaceProblem | null {
      if (status === "ok") {
        problemRun = 0;
        candidate = null;
        okRun += 1;
        if (okRun >= OK_CHECKS) shown = null;
        return shown;
      }
      okRun = 0;
      problemRun = status === candidate ? problemRun + 1 : 1;
      candidate = status;
      if (problemRun >= PROBLEM_CHECKS) shown = status;
      return shown;
    },
  };
}

export const FACE_HINTS: Record<FaceProblem | "camera_off", LocalizedLine> = {
  no_face: {
    en: "I can't see your face. Please face the camera.",
    tl: "Hindi ko makita ang mukha mo. Humarap ka sa camera.",
    ceb: "Dili nako makita ang imong nawong. Palihug atubanga ang camera.",
  },
  too_far: {
    en: "Please move a little closer to the camera.",
    tl: "Lumapit ka nang kaunti sa camera.",
    ceb: "Palihug duol og gamay sa camera.",
  },
  too_dark: {
    en: "It's a bit dark. Try facing a light or a window.",
    tl: "Medyo madilim. Subukang humarap sa ilaw o bintana.",
    ceb: "Medyo ngitngit. Sulayi pag-atubang sa suga o bintana.",
  },
  camera_off: {
    en: "Your camera is off — your therapist won't see your expressions for these answers.",
    tl: "Naka-off ang camera mo — hindi makikita ng therapist mo ang iyong ekspresyon sa mga sagot na ito.",
    ceb: "Naka-off ang imong camera — dili makita sa imong therapist ang imong ekspresyon niini nga mga tubag.",
  },
};
