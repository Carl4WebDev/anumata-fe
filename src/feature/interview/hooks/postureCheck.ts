/**
 * Head down ("yuko") and blank stare ("tulala") from the face detector's
 * once-a-second sightings, on the patient's own device. These are posture
 * cues, not emotions: on their own they never trigger anything — the check-in
 * also needs the patient to be silent (see struggleCheck.ts).
 *
 * Approximate by nature (camera angle, glasses, light), so the thresholds are
 * generous and measured against the patient's own usual position.
 */

/** One sighting: positions as fractions of the frame (0–1); null = no face seen. */
export interface FaceSighting {
  /** Vertical centre of the face box. */
  cy: number;
  /** Face box height. */
  height: number;
  /** Detector keypoints (eyes, nose, mouth, ears). */
  points: { x: number; y: number }[];
}

export interface Posture {
  /** How long the head has been down (or the face gone after being seen), in ms. */
  headDownMs: number;
  /** How long the face has stayed almost perfectly still, in ms. */
  stillMs: number;
}

// The face drops this far below its usual height in the frame → head down.
export const HEAD_DOWN_SHIFT = 0.08;
// Keypoints moving less than this (fraction of the frame, on average) between checks → still.
export const STILL_MOVEMENT = 0.006;
// Sightings used to learn where the patient's face usually is.
const BASELINE_SIGHTINGS = 5;
// One check is ~1 s; a longer gap (tab hidden, slow device) counts as at most this.
const MAX_STEP_MS = 1500;

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
};

function movement(a: FaceSighting, b: FaceSighting): number | null {
  const n = Math.min(a.points.length, b.points.length);
  if (n === 0) return null;
  let sum = 0;
  for (let i = 0; i < n; i += 1) sum += Math.abs(a.points[i].x - b.points[i].x) + Math.abs(a.points[i].y - b.points[i].y);
  return sum / (2 * n);
}

export function createPostureTracker() {
  const firstSightings: number[] = [];
  let baselineCy: number | null = null;
  let last: FaceSighting | null = null;
  let lastAt: number | null = null;
  let headDownMs = 0;
  let stillMs = 0;

  return {
    /** `usable`: the picture is bright enough that a missing face means the patient, not the light. */
    feed(sighting: FaceSighting | null, usable: boolean, at: number): void {
      const step = lastAt === null ? 0 : Math.min(MAX_STEP_MS, Math.max(0, at - lastAt));
      lastAt = at;

      if (!sighting) {
        // Face gone after being seen (looked down, turned away) counts as head down — unless it's just dark.
        headDownMs = baselineCy !== null && usable ? headDownMs + step : 0;
        stillMs = 0;
        last = null;
        return;
      }

      if (baselineCy === null) {
        firstSightings.push(sighting.cy);
        if (firstSightings.length >= BASELINE_SIGHTINGS) baselineCy = median(firstSightings);
      }
      const down = baselineCy !== null && sighting.cy - baselineCy > HEAD_DOWN_SHIFT;
      headDownMs = down ? headDownMs + step : 0;

      const moved = last ? movement(last, sighting) : null;
      stillMs = moved !== null && moved < STILL_MOVEMENT ? stillMs + step : 0;
      last = sighting;
    },

    read(): Posture {
      return { headDownMs, stillMs };
    },

    /** New question: the clocks start again (where the face usually is stays learned). */
    resetClocks(): void {
      headDownMs = 0;
      stillMs = 0;
    },
  };
}

export type PostureTracker = ReturnType<typeof createPostureTracker>;
