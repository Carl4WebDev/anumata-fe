import { describe, test, expect } from "vitest";
import { assessFace, createFaceHintTracker, FACE_HINTS, PROBLEM_CHECKS, OK_CHECKS } from "../faceCheck";

const face = (width: number, score = 0.9) => ({ width, score });

describe("assessFace", () => {
  test("a clear, close face is fine", () => {
    expect(assessFace({ faces: [face(0.3)], brightness: 0.5 })).toBe("ok");
  });

  test("no face found", () => {
    expect(assessFace({ faces: [], brightness: 0.5 })).toBe("no_face");
  });

  test("unsure detections don't count as a face", () => {
    expect(assessFace({ faces: [face(0.3, 0.2)], brightness: 0.5 })).toBe("no_face");
  });

  test("a small face means the patient is too far away", () => {
    expect(assessFace({ faces: [face(0.08)], brightness: 0.5 })).toBe("too_far");
  });

  test("no face in a dark picture: the light is the problem", () => {
    expect(assessFace({ faces: [], brightness: 0.1 })).toBe("too_dark");
  });

  test("a face in a very dark picture still gets the light hint", () => {
    expect(assessFace({ faces: [face(0.3)], brightness: 0.08 })).toBe("too_dark");
  });

  test("uses the largest face when several are found", () => {
    expect(assessFace({ faces: [face(0.05), face(0.3)], brightness: 0.5 })).toBe("ok");
  });

  test("brightness unknown (no canvas) → judged on the face alone", () => {
    expect(assessFace({ faces: [face(0.3)], brightness: null })).toBe("ok");
  });
});

describe("createFaceHintTracker (no flicker)", () => {
  test("a hint appears only after the problem lasts a few checks", () => {
    const tracker = createFaceHintTracker();
    for (let i = 1; i < PROBLEM_CHECKS; i++) expect(tracker.feed("no_face")).toBeNull();
    expect(tracker.feed("no_face")).toBe("no_face");
  });

  test("glancing away briefly shows nothing", () => {
    const tracker = createFaceHintTracker();
    tracker.feed("no_face");
    tracker.feed("no_face");
    expect(tracker.feed("ok")).toBeNull();
    expect(tracker.feed("no_face")).toBeNull();
  });

  test("the hint clears after a couple of good checks", () => {
    const tracker = createFaceHintTracker();
    for (let i = 0; i < PROBLEM_CHECKS; i++) tracker.feed("too_far");
    for (let i = 1; i < OK_CHECKS; i++) expect(tracker.feed("ok")).toBe("too_far");
    expect(tracker.feed("ok")).toBeNull();
  });

  test("switches to the new problem when it changes and persists", () => {
    const tracker = createFaceHintTracker();
    for (let i = 0; i < PROBLEM_CHECKS; i++) tracker.feed("too_far");
    for (let i = 0; i < PROBLEM_CHECKS; i++) tracker.feed("too_dark");
    expect(tracker.feed("too_dark")).toBe("too_dark");
  });
});

describe("FACE_HINTS", () => {
  test("every hint exists in all three languages", () => {
    for (const hint of Object.values(FACE_HINTS)) expect(hint.en && hint.tl && hint.ceb).toBeTruthy();
  });
});
