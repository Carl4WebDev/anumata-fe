import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, fireEvent, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import InterviewRoom from "../InterviewRoomPage";
import type { CaptionPhrase, CaptionActivity } from "../../hooks/useLiveCaptions";

// ─── Fakes: voice out (TTS), voice in (captions), media, APIs ───

const spoken: string[] = [];
// Does the fake device have a Filipino voice? (Most tests: yes.)
const voices = { filipino: true };
vi.mock("../../hooks/useTTS", () => ({
  useTTS: () => ({
    speak: (text: string) => {
      spoken.push(text);
      return Promise.resolve();
    },
    stop: vi.fn(),
    isSpeaking: false,
    isMuted: false,
    toggleMute: vi.fn(),
    isSupported: true,
    voicesLoaded: true,
    hasVoiceFor: (locale: string) => !locale.startsWith("fil") || voices.filipino,
  }),
}));

const mic = {
  turn: 0,
  activity: { lastVoiceAt: null, voiceActive: false, pending: 0 } as CaptionActivity,
  onPhrase: null as ((p: CaptionPhrase) => void) | null,
};
vi.mock("../../hooks/useLiveCaptions", () => ({
  useLiveCaptions: (_stream: unknown, options: { onPhrase?: (p: CaptionPhrase) => void }) => {
    mic.onPhrase = options.onPhrase ?? null;
    return {
      turnSegments: [],
      interim: "",
      engine: "browser",
      suspend: vi.fn(),
      turn: mic.turn,
      voiceActive: false,
      running: true,
      error: null,
      start: vi.fn(),
      stop: vi.fn(),
      newTurn: () => {
        mic.turn += 1;
        mic.activity = { lastVoiceAt: null, voiceActive: false, pending: 0 };
        return mic.turn;
      },
      getActivity: () => mic.activity,
      getLevel: () => 0,
      getTurn: () => mic.turn,
    };
  },
}));

// The interview link's questions (tests may give some a therapist follow-up).
const DEFAULT_QUESTIONS = ["How have you been sleeping?", "What helps you relax?"];
const link = { questions: DEFAULT_QUESTIONS as unknown[] };
vi.mock("../../../../shared/api/interviewLinksApi", () => ({
  interviewLinksApi: {
    getByToken: () =>
      Promise.resolve({
        data: {
          questions: link.questions,
          patient_name: "Maria",
          question_set_name: "Intake",
        },
      }),
  },
}));
vi.mock("../../../../shared/api/healthApi", () => ({ fetchSystemHealth: () => Promise.resolve({}) }));
vi.mock("../../../../shared/api/translateApi", () => ({ translateQuestion: () => Promise.resolve(null) }));
// The real face check runs MediaPipe (WASM), which jsdom can't: control its hint directly.
const faceCheck = {
  hint: null as null | "no_face" | "too_far" | "too_dark",
  lastActive: false,
  // Where the fake camera sees the face each second (for the head-down / blank-stare tracker).
  onSighting: null as null | ((s: { cy: number; height: number; points: { x: number; y: number }[] } | null, usable: boolean) => void),
};
vi.mock("../../hooks/useFaceCheck", () => ({
  useFaceCheck: (_ref: unknown, active: boolean, onSighting?: typeof faceCheck.onSighting) => {
    faceCheck.onSighting = onSighting ?? null;
    faceCheck.lastActive = active;
    return active ? faceCheck.hint : null;
  },
}));
const stageFiles = vi.fn().mockResolvedValue(undefined);
const reportCrisis = vi.fn().mockResolvedValue(true);
vi.mock("../../../../shared/api/emotionApi", () => ({
  emotionApi: {
    stageFiles: (...args: unknown[]) => stageFiles(...args),
    reportCrisis: (...args: unknown[]) => reportCrisis(...args),
  },
}));
const storeFiles = vi.fn().mockResolvedValue(undefined);
const addFiles = vi.fn().mockResolvedValue(undefined);
const deleteFiles = vi.fn().mockResolvedValue(undefined);
vi.mock("../../../../shared/utils/fileStorage", () => ({
  storeFiles: (...args: unknown[]) => storeFiles(...args),
  addFiles: (...args: unknown[]) => addFiles(...args),
  deleteFiles: (...args: unknown[]) => deleteFiles(...args),
}));

class FakeRecorder {
  state = "inactive";
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  start() {
    this.state = "recording";
  }
  pause() {
    this.state = "paused";
  }
  resume() {
    this.state = "recording";
  }
  stop() {
    this.state = "inactive";
    this.ondataavailable?.({ data: new Blob(["a"]) });
    this.onstop?.();
  }
}

/** The patient says something (a transcribed phrase lands). */
async function say(text: string) {
  mic.activity = { ...mic.activity, lastVoiceAt: Date.now() };
  await act(async () => mic.onPhrase?.({ turn: mic.turn, text, language: "en" }));
}

// Most tests aren't about the mood check: skip it whenever the faces appear (mood tests turn this off).
const moodCheck = { autoSkip: true };

async function wait(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
  if (moodCheck.autoSkip && screen.queryByRole("group", { name: "How are you feeling?" })) {
    fireEvent.click(screen.getByRole("button", { name: /^(Skip|Laktawan)$/ }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });
  }
}

function renderRoom() {
  return render(
    <MemoryRouter initialEntries={["/interview/tok/room"]}>
      <Routes>
        <Route path="/interview/:token/room" element={<InterviewRoom />} />
        <Route path="/interview/:token/processing" element={<p>Processing page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: false });
  spoken.length = 0;
  link.questions = DEFAULT_QUESTIONS;
  moodCheck.autoSkip = true;
  mic.turn = 0;
  mic.activity = { lastVoiceAt: null, voiceActive: false, pending: 0 };
  storeFiles.mockClear();
  stageFiles.mockClear();
  reportCrisis.mockReset().mockResolvedValue(true);
  faceCheck.hint = null;
  faceCheck.lastActive = false;
  voices.filipino = true;
  addFiles.mockReset().mockResolvedValue(undefined);
  deleteFiles.mockReset().mockResolvedValue(undefined);
  sessionStorage.clear();
  localStorage.clear();
  const track = { enabled: true, stop: vi.fn() };
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: {
      getUserMedia: () =>
        Promise.resolve({
          getTracks: () => [track],
          getAudioTracks: () => [track],
          getVideoTracks: () => [track],
        }),
    },
  });
  vi.stubGlobal("MediaRecorder", FakeRecorder);
  vi.stubGlobal("MediaStream", class {});
  vi.spyOn(window, "confirm").mockReturnValue(true);
  // jsdom has no canvas; frame capture simply yields nothing.
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function startAndWarmUp() {
  renderRoom();
  await wait(10);
  fireEvent.click(screen.getByRole("button", { name: "Start Interview" }));
  await wait(10);
  // Warm-up question 1 → answer → short pause → acknowledgment → question 2.
  expect(spoken.some((s) => s.includes("Hi Maria"))).toBe(true);
  await say("Okay lang, medyo pagod");
  await wait(3000);
  await say("Wala naman");
  await wait(3000);
  // "Ready to start the interview?" — Tagalog was detected from the answers.
  expect(screen.getByText("Salamat. Handa ka nang magsimula?")).toBeInTheDocument();
}

describe("InterviewRoom — hands-free voice flow", () => {
  test("crisis words: help card in the patient's language, one urgent alert, interview carries on", async () => {
    await startAndWarmUp();
    await say("Oo");
    await wait(10);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    // Split across two captions, as speech often is.
    await say("Minsan gusto ko nang");
    await say("mamatay");
    await wait(10);
    expect(screen.getByRole("alert")).toHaveTextContent("Hindi ka nag-iisa");
    expect(screen.getByRole("link", { name: "1553" })).toBeInTheDocument();
    expect(reportCrisis).toHaveBeenCalledTimes(1);
    expect(reportCrisis).toHaveBeenCalledWith("tok");
    expect(screen.getByText(/Nasabihan na rin ang iyong therapist/)).toBeInTheDocument();

    // Saying it again doesn't alert twice; the answer and interview continue as normal.
    await say("Ayoko nang mabuhay");
    await wait(10);
    expect(reportCrisis).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Question 1 of 2")).toBeInTheDocument();
    await say("Tapos na");
    await wait(10);
    expect(screen.getByText("Question 2 of 2")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument(); // still there for the next question
  });

  test("the card never claims the therapist was told if the alert failed", async () => {
    reportCrisis.mockResolvedValue(false);
    await startAndWarmUp();
    await say("Oo");
    await wait(10);
    await say("I want to kill myself");
    await wait(10);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(within(screen.getByRole("alert")).queryByText(/therapist/i)).not.toBeInTheDocument();
  });

  test("face hints appear on the video in the patient's language, and pause during a break", async () => {
    await startAndWarmUp();
    faceCheck.hint = "too_far"; // picked up as the first question renders
    await say("Oo");
    await wait(10);
    expect(faceCheck.lastActive).toBe(true);
    expect(screen.getByText("Lumapit ka nang kaunti sa camera.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Take a break/ }));
    await wait(10);
    expect(faceCheck.lastActive).toBe(false);
    expect(screen.queryByText("Lumapit ka nang kaunti sa camera.")).not.toBeInTheDocument();
  });

  test("turning the camera off shows a gentle note instead of face hints", async () => {
    await startAndWarmUp();
    fireEvent.click(screen.getByTitle("Turn off camera"));
    await wait(10);
    expect(faceCheck.lastActive).toBe(false);
    expect(screen.getByText(/Naka-off ang camera mo/)).toBeInTheDocument();
  });

  test("progress and recordings are kept after every answer, then cleared when done", async () => {
    await startAndWarmUp();
    await say("Oo");
    await wait(10);
    expect(deleteFiles).toHaveBeenCalledWith("tok"); // a fresh start drops old recordings

    await say("Hindi masyado");
    await say("Tapos na");
    await wait(10);
    const progress = JSON.parse(sessionStorage.getItem("amumata_progress_tok") ?? "{}");
    expect(progress).toMatchObject({ nextIndex: 1, answers: { 0: "Hindi masyado" }, lang: "tl" });
    expect(addFiles.mock.calls[0][0]).toBe("tok");
    expect(addFiles.mock.calls[0][1].map((f: { name: string }) => f.name)).toContain("audio_0.webm");

    await say("Music");
    await say("Tapos na");
    await wait(50);
    expect(screen.getByText("Processing page")).toBeInTheDocument();
    expect(sessionStorage.getItem("amumata_progress_tok")).toBeNull();
    expect(storeFiles).not.toHaveBeenCalled(); // answers were already saved one by one
  });

  test("after a refresh: 'Continue from question 2' skips the warm-up and keeps earlier answers", async () => {
    sessionStorage.setItem(
      "amumata_progress_tok",
      JSON.stringify({
        nextIndex: 1,
        answers: { 0: "Hindi masyado" },
        lang: "tl",
        elapsed: 95,
        rapportResponses: [],
        crisis: false,
        savedAt: Date.now(),
      }),
    );
    renderRoom();
    await wait(10);
    expect(screen.getByText(/You've answered 1 of 2 questions/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Start Interview" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Continue from question 2" }));
    await wait(10);
    expect(spoken).toContain("Maligayang pagbabalik. Ituloy natin kung saan tayo huminto.");
    expect(spoken).toContain("What helps you relax?");
    expect(spoken.some((s) => s.includes("Hi Maria"))).toBe(false); // no warm-up again
    expect(screen.getByText("Question 2 of 2")).toBeInTheDocument();

    await say("Music helps");
    await say("Tapos na");
    await wait(50);
    const saved = JSON.parse(sessionStorage.getItem("amumata_result_tok") ?? "{}");
    expect(saved.responses).toEqual([
      { question: "How have you been sleeping?", answer: "Hindi masyado" },
      { question: "What helps you relax?", answer: "Music helps" },
    ]);
    expect(saved.duration).toBeGreaterThanOrEqual(95);
  });

  test("'Start over' discards the saved progress and recordings", async () => {
    sessionStorage.setItem(
      "amumata_progress_tok",
      JSON.stringify({ nextIndex: 1, answers: {}, lang: "en", elapsed: 10, rapportResponses: [], crisis: false, savedAt: Date.now() }),
    );
    renderRoom();
    await wait(10);
    fireEvent.click(screen.getByRole("button", { name: "Start over" }));
    expect(sessionStorage.getItem("amumata_progress_tok")).toBeNull();
    expect(deleteFiles).toHaveBeenCalledWith("tok");
    expect(screen.getByRole("button", { name: "Start Interview" })).toBeInTheDocument();
  });

  test("no Filipino voice on the device: Amumata speaks English, the screen stays in Tagalog", async () => {
    voices.filipino = false;
    await startAndWarmUp();
    // Permission prompt: Tagalog on screen, English out loud.
    expect(screen.getByText("Salamat. Handa ka nang magsimula?")).toBeInTheDocument();
    expect(spoken).toContain("Thank you. Ready to start the interview?");
    expect(spoken).not.toContain("Salamat. Handa ka nang magsimula?");
    expect(screen.getByText(/Ingles ang boses ni Amumata sa device na ito/)).toBeInTheDocument();

    await say("Oo");
    await wait(10);
    await say("Hindi ako makatulog");
    await say("Tapos na");
    await wait(10);
    expect(spoken).toContain("Thank you for sharing that.");
    expect(spoken).not.toContain("Salamat sa pagbabahagi mo niyan.");
  });

  test("with a Filipino voice, Tagalog is spoken and no note is shown", async () => {
    await startAndWarmUp();
    expect(spoken).toContain("Salamat. Handa ka nang magsimula?");
    expect(screen.queryByText(/Ingles ang boses ni Amumata/)).not.toBeInTheDocument();
  });

  test("comfort options chosen on the start screen carry into the interview", async () => {
    renderRoom();
    await wait(10);
    fireEvent.click(screen.getByRole("button", { name: "Larger text" }));
    fireEvent.click(screen.getByRole("button", { name: "Start Interview" }));
    await wait(10);
    expect(screen.getByRole("button", { name: "Larger text" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Slower voice" })).toHaveAttribute("aria-pressed", "false");
  });

  test("a short real answer ('Ayos lang', 'Oo') is kept as the answer, not taken as 'next'", async () => {
    await startAndWarmUp();
    await say("Oo");
    await wait(10);
    await say("Ayos lang");
    await say("Oo");
    await wait(10);
    expect(screen.getByText("Question 1 of 2")).toBeInTheDocument();
    // Only after the "moving on" notice does "oo" mean "yes, move on".
    await wait(3500);
    expect(spoken.some((s) => s.startsWith("Lilipat na tayo"))).toBe(true);
    await say("Oo");
    await wait(10);
    expect(screen.getByText("Question 2 of 2")).toBeInTheDocument();
  });

  test("warm-up proceeds by voice and answers set the patient's language", async () => {
    await startAndWarmUp();
    // "okay lang" was kept as a real answer, not swallowed as a command.
    expect(screen.getByText("Okay lang, medyo pagod")).toBeInTheDocument();
    expect(spoken.some((s) => s.includes("pagod") || s.includes("Salamat"))).toBe(true);
  });

  test("a spoken 'oo' starts the interview; 3 s of silence → 'moving on' notice → 'yes' → next question", async () => {
    await startAndWarmUp();
    await say("Oo");
    await wait(10);
    expect(screen.getByText("Question 1 of 2")).toBeInTheDocument();
    expect(spoken).toContain("How have you been sleeping?");

    await say("Hindi ako makatulog nang maayos lately");
    await wait(2500);
    expect(spoken.some((s) => s.startsWith("Lilipat na tayo"))).toBe(false); // not yet
    await wait(1000);
    expect(spoken.some((s) => s.startsWith("Lilipat na tayo"))).toBe(true); // notice after 3 s
    expect(screen.getByRole("timer")).toHaveTextContent(/Moving on in 3/);

    await say("Oo, tapos na");
    await wait(10);
    expect(screen.getByText("Question 2 of 2")).toBeInTheDocument();
  });

  test("thanks the patient between questions and says goodbye after the last one", async () => {
    await startAndWarmUp();
    await say("Oo");
    await wait(10);
    await say("Hindi ako makatulog");
    await say("Tapos na");
    await wait(10);
    // Tagalog thank-you, then the next question.
    const thanks = spoken.indexOf("Salamat sa pagbabahagi mo niyan.");
    expect(thanks).toBeGreaterThan(-1);
    expect(spoken.indexOf("What helps you relax?")).toBeGreaterThan(thanks);

    await say("Music");
    await say("Tapos na");
    await wait(50);
    expect(spoken).toContain(
      "Maraming salamat, Maria. Hindi madaling ibahagi ang nararamdaman mo. Sine-save ko na ang mga sagot mo. Pag-uusapan ninyo ito ng therapist mo.",
    );
    expect(screen.getByText("Processing page")).toBeInTheDocument();
  });

  test("no thank-you after a question the patient didn't answer", async () => {
    await startAndWarmUp();
    await say("Oo");
    await wait(10);
    await wait(13500); // silence → a gentle check-in first
    await wait(15500); // still silent → "would you like to move on?"
    await wait(3500); // no reply → "let's move on"
    expect(screen.getByText("Question 2 of 2")).toBeInTheDocument();
    expect(spoken.some((s) => s.startsWith("Salamat sa"))).toBe(false);
  });

  test("a break pauses everything; 'handa na' resumes and repeats the question", async () => {
    await startAndWarmUp();
    await say("Oo");
    await wait(10);
    await say("Medyo mahirap");

    fireEvent.click(screen.getByRole("button", { name: /Take a break/ }));
    await wait(10);
    expect(spoken.some((s) => s.startsWith("Sige, magpahinga ka muna"))).toBe(true);
    expect(screen.getByRole("button", { name: /I.m ready/ })).toBeInTheDocument();

    // A long pause: no check-in, no moving on, and break chatter isn't part of the answer.
    await say("Teka, kukuha lang ako ng tubig");
    await wait(30000);
    expect(spoken.some((s) => s.startsWith("Lilipat na tayo") || s.startsWith("Walang pagmamadali"))).toBe(false);
    expect(screen.getByText("Question 1 of 2")).toBeInTheDocument();

    const askedBefore = spoken.filter((s) => s === "How have you been sleeping?").length;
    await say("Handa na");
    await wait(10);
    expect(spoken.some((s) => s.startsWith("Maligayang pagbabalik"))).toBe(true);
    expect(spoken.filter((s) => s === "How have you been sleeping?").length).toBe(askedBefore + 1);
    expect(screen.queryByRole("button", { name: /I.m ready/ })).not.toBeInTheDocument();

    await say("Tapos na");
    await wait(10);
    await say("Music");
    await say("Tapos na");
    await wait(50);
    const saved = JSON.parse(sessionStorage.getItem("amumata_result_tok") ?? "{}");
    expect(saved.responses[0].answer).toBe("Medyo mahirap");
  });

  test("saying 'pahinga muna' starts a break by voice", async () => {
    await startAndWarmUp();
    await say("Oo");
    await wait(10);
    await say("Pahinga muna");
    await wait(10);
    expect(screen.getByRole("button", { name: /I.m ready/ })).toBeInTheDocument();
  });

  test("talking during the countdown continues the answer instead of moving on", async () => {
    await startAndWarmUp();
    await say("Oo");
    await wait(10);
    await say("Medyo okay naman");
    await wait(3500);
    expect(spoken.some((s) => s.startsWith("Lilipat na tayo"))).toBe(true);

    await say("Pero minsan nagigising ako ng madaling araw");
    await wait(10);
    expect(screen.getByText("Question 1 of 2")).toBeInTheDocument();
    expect(screen.getByText("Listening")).toBeInTheDocument();
    expect(screen.queryByRole("timer")).not.toBeInTheDocument();
  });

  test("answer + 3 s of silence → notice, then moves on by itself after the countdown", async () => {
    await startAndWarmUp();
    await say("Oo");
    await wait(10);
    await say("Ayos lang");
    await wait(3500); // notice
    await wait(3500); // countdown runs out
    expect(screen.getByText("Question 2 of 2")).toBeInTheDocument();
    expect(spoken).not.toContain("Sige, lumipat na tayo."); // the notice already said it
  });

  test("no answer at all → asks first, then says it's moving on and does", async () => {
    await startAndWarmUp();
    await say("Oo");
    await wait(10);
    await wait(13500); // thinking time → "Okay ka pa ba na magpatuloy?"
    expect(spoken.some((s) => s.startsWith("Okay ka pa ba na magpatuloy?"))).toBe(true);
    await wait(15500); // still nothing → "Gusto mo na bang lumipat…?"
    expect(spoken.some((s) => s.startsWith("Walang pagmamadali"))).toBe(true);
    await wait(3500); // no reply
    expect(spoken).toContain("Sige, lumipat na tayo.");
    expect(screen.getByText("Question 2 of 2")).toBeInTheDocument();
  });

  test("'repeat' replays the question; last question finishes and saves answers", async () => {
    await startAndWarmUp();
    await say("Oo");
    await wait(10);
    const askedBefore = spoken.filter((s) => s === "How have you been sleeping?").length;
    await say("Pakiulit po");
    await wait(10);
    expect(spoken.filter((s) => s === "How have you been sleeping?").length).toBe(askedBefore + 1);

    await say("Hindi masyado");
    await say("Next");
    await wait(10);
    await say("Music helps me relax");
    await say("That's all");
    await wait(50);

    expect(screen.getByText("Processing page")).toBeInTheDocument();
    const saved = JSON.parse(sessionStorage.getItem("amumata_result_tok") ?? "{}");
    expect(saved.responses).toEqual([
      { question: "How have you been sleeping?", answer: "Hindi masyado" },
      { question: "What helps you relax?", answer: "Music helps me relax" },
    ]);
    // Recordings are kept answer by answer; the last answer's are added on finishing.
    const savedNames = addFiles.mock.calls.flatMap((c) => c[1].map((f: { name: string }) => f.name));
    expect(savedNames).toEqual(expect.arrayContaining(["audio_0.webm", "audio_1.webm"]));
  });

  test("if the browser can't keep recordings answer by answer, everything is saved at the end", async () => {
    addFiles.mockRejectedValue(new Error("QuotaExceededError"));
    await startAndWarmUp();
    await say("Oo");
    await wait(10);
    await say("Hindi masyado");
    await say("Tapos na");
    await wait(10);
    await say("Music");
    await say("Tapos na");
    await wait(50);
    expect(screen.getByText("Processing page")).toBeInTheDocument();
    const names = storeFiles.mock.calls[0][1].map((f: { name: string }) => f.name);
    expect(names).toEqual(expect.arrayContaining(["audio_0.webm", "audio_1.webm"]));
  });

  test("each finished answer is uploaded early, while the next question is asked", async () => {
    await startAndWarmUp();
    await say("Oo");
    await wait(10);
    await say("Hindi masyado");
    await say("Next");
    await wait(10);
    expect(screen.getByText("Question 2 of 2")).toBeInTheDocument();
    expect(stageFiles).toHaveBeenCalledTimes(1);
    const [token, files] = stageFiles.mock.calls[0] as [string, File[]];
    expect(token).toBe("tok");
    expect(files.map((f) => f.name)).toEqual(["audio_0.webm"]);
    expect(JSON.parse(sessionStorage.getItem("amumata_staged_tok") ?? "[]")).toEqual(["audio_0.webm"]);
  });

  test("buttons still work when voice fails", async () => {
    await startAndWarmUp();
    fireEvent.click(screen.getByRole("button", { name: "Start the interview" }));
    await wait(100);
    expect(screen.getByText("Question 1 of 2")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Done — next question/ }));
    await wait(100);
    expect(screen.getByText("Question 2 of 2")).toBeInTheDocument();
  });
});

describe("InterviewRoom — therapist follow-ups", () => {
  const FOLLOW_UP = "What did that feel like for you?";

  test("a short answer gets the follow-up once; the reply belongs to the same question", async () => {
    link.questions = [{ text: "How have you been sleeping?", follow_up: FOLLOW_UP }, "What helps you relax?"];
    await startAndWarmUp();
    await say("Oo");
    await wait(10);

    await say("Hindi masyado");
    await wait(3500);
    expect(spoken.filter((s) => s === FOLLOW_UP)).toHaveLength(1);
    expect(screen.getByText(FOLLOW_UP)).toBeInTheDocument();
    expect(screen.getByText("Question 1 of 2")).toBeInTheDocument();

    // The reply to the follow-up, then the usual "moving on" — no second follow-up.
    await say("Mabigat sa dibdib");
    await wait(3500);
    await wait(3500);
    expect(spoken.filter((s) => s === FOLLOW_UP)).toHaveLength(1);
    expect(screen.getByText("Question 2 of 2")).toBeInTheDocument();
  });

  test("a long answer is not asked for more", async () => {
    link.questions = [{ text: "How have you been sleeping?", follow_up: FOLLOW_UP }, "What helps you relax?"];
    await startAndWarmUp();
    await say("Oo");
    await wait(10);
    await say(Array.from({ length: 45 }, () => "salita").join(" "));
    await wait(3500);
    await wait(3500);
    expect(spoken).not.toContain(FOLLOW_UP);
    expect(screen.getByText("Question 2 of 2")).toBeInTheDocument();
  });

  test("saying you're done skips the follow-up", async () => {
    link.questions = [{ text: "How have you been sleeping?", follow_up: FOLLOW_UP }, "What helps you relax?"];
    await startAndWarmUp();
    await say("Oo");
    await wait(10);
    await say("Okay lang");
    await say("Tapos na");
    await wait(10);
    expect(spoken).not.toContain(FOLLOW_UP);
    expect(screen.getByText("Question 2 of 2")).toBeInTheDocument();
  });
});

describe("InterviewRoom — mood check before and after", () => {
  test("asks how the patient feels before the first question and after the last, and saves both", async () => {
    moodCheck.autoSkip = false;
    await startAndWarmUp();
    await say("Oo");
    await wait(10);

    // Before: asked in the patient's language, and the interview waits for a face.
    expect(spoken).toContain("Bago tayo magsimula — ano ang pakiramdam mo ngayon? Pumili ng mukha.");
    expect(screen.queryByText("Question 1 of 2")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Hindi maganda" }));
    await wait(10);
    expect(screen.getByText("Question 1 of 2")).toBeInTheDocument();

    await say("Tapos na");
    await wait(10);
    await say("Tapos na");
    await wait(10);

    // After the last answer: asked again before the goodbye.
    expect(spoken).toContain("At ngayong tapos na tayo — ano ang pakiramdam mo? Pumili ng mukha.");
    fireEvent.click(screen.getByRole("button", { name: "Mabuti" }));
    await wait(100);

    const saved = JSON.parse(sessionStorage.getItem("amumata_result_tok") ?? "{}");
    expect(saved.selfReport).toEqual({ mood_before: 2, mood_after: 4 });
    expect(screen.getByText("Processing page")).toBeInTheDocument();
  });

  test("the patient can skip it", async () => {
    moodCheck.autoSkip = false;
    await startAndWarmUp();
    await say("Oo");
    await wait(10);
    fireEvent.click(screen.getByRole("button", { name: "Laktawan" }));
    await wait(10);
    expect(screen.getByText("Question 1 of 2")).toBeInTheDocument();
  });
});

describe("InterviewRoom — feeling at ease", () => {
  test("before starting, Amumata says there are no wrong answers and only the therapist sees them", async () => {
    await startAndWarmUp();
    expect(spoken).toContain(
      "Bago tayo magsimula: walang tama o maling sagot, at ang therapist mo lang ang makakakita nito. Magsalita ka hangga't gusto mo, sa kahit anong wika. Puwede mong sabihing “tapos na” para lumipat sa susunod na tanong, o humingi ng pahinga anumang oras.",
    );
  });

  test("a calm recording label: no red light, no running clock", async () => {
    await startAndWarmUp();
    await say("Oo");
    await wait(10);
    expect(screen.getByText("Recording for your therapist")).toBeInTheDocument();
    expect(screen.queryByText(/^\d\d:\d\d$/)).not.toBeInTheDocument();
  });

  test("'More time to think' waits longer before moving on, and the tip says so", async () => {
    await startAndWarmUp();
    fireEvent.click(screen.getByRole("button", { name: "More time to think" }));
    await say("Oo");
    await wait(10);
    expect(screen.getByText(/Huminto ng 7 segundo/)).toBeInTheDocument();

    await say("Hindi masyado");
    await wait(3500);
    expect(screen.queryByRole("timer")).not.toBeInTheDocument(); // 3 s would already have shown "moving on"
    await wait(4000);
    expect(screen.getByRole("timer")).toBeInTheDocument();
  });
});

describe("InterviewRoom — feeling words", () => {
  test("tapped words are kept per question and saved with the interview", async () => {
    await startAndWarmUp();
    await say("Oo");
    await wait(10);

    // Question 1: two words, in the patient's language (Tagalog).
    fireEvent.click(screen.getByRole("button", { name: /Nag-aalala/ }));
    fireEvent.click(screen.getByRole("button", { name: /Pagod/ }));
    expect(screen.getByText("Salamat. Kung kaya mo, ikuwento mo nang kaunti.")).toBeInTheDocument();
    await say("Tapos na");
    await wait(10);

    // Question 2 starts with nothing selected.
    expect(screen.getByRole("button", { name: /Nag-aalala/ })).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(screen.getByRole("button", { name: /May pag-asa/ }));
    await say("Tapos na");
    await wait(100);

    const saved = JSON.parse(sessionStorage.getItem("amumata_result_tok") ?? "{}");
    expect(saved.feelingsTapped).toEqual({ 0: ["worried", "tired"], 1: ["hopeful"] });
  });

  test("tapping during the 'moving on' countdown keeps the question open", async () => {
    await startAndWarmUp();
    await say("Oo");
    await wait(10);
    await say("Hindi masyado");
    await wait(3500);
    expect(screen.getByRole("timer")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Malungkot/ }));
    await wait(10);
    expect(screen.queryByRole("timer")).not.toBeInTheDocument();
    expect(screen.getByText("Question 1 of 2")).toBeInTheDocument();
  });
});

describe("InterviewRoom — gentle check-ins when the patient struggles", () => {
  const CHECK_IN_TL = "Okay ka pa ba na magpatuloy?";
  const checkInSaid = () => spoken.some((s) => s.startsWith(CHECK_IN_TL));
  const feelingChips = () => screen.getByRole("group", { name: /Mahirap bang sabihin/ }).parentElement;

  test("no answer for a while → 'Okay ka pa ba?' with the feeling words highlighted; 'oo' carries on", async () => {
    await startAndWarmUp();
    await say("Oo");
    await wait(10);
    await wait(12000);
    expect(checkInSaid()).toBe(false);
    await wait(1500);
    expect(checkInSaid()).toBe(true);
    expect(feelingChips()).toHaveAttribute("data-highlight", "true");
    expect(screen.getByRole("button", { name: /Okay lang ako — ituloy/ })).toBeInTheDocument();

    await say("Oo");
    await wait(10);
    expect(spoken).toContain("Sige. Dahan-dahan lang — nakikinig ako.");
    expect(screen.queryByRole("button", { name: /Okay lang ako — ituloy/ })).not.toBeInTheDocument();
    expect(screen.getByText("Question 1 of 2")).toBeInTheDocument();
  });

  test("'ambot' (I don't know) → a check-in after a short pause; 'pahinga' starts a break", async () => {
    await startAndWarmUp();
    await say("Oo");
    await wait(10);
    await say("Ambot");
    await wait(3000);
    expect(checkInSaid()).toBe(true);
    await say("Pahinga muna");
    await wait(10);
    expect(spoken.some((s) => s.startsWith("Sige, magpahinga ka muna"))).toBe(true);
  });

  test("skipping after a check-in is saved, and the skipped question is marked for the analysis", async () => {
    await startAndWarmUp();
    await say("Oo");
    await wait(10);
    await wait(13500);
    fireEvent.click(screen.getByRole("button", { name: /Laktawan ang tanong/ }));
    await wait(10);
    expect(screen.getByText("Question 2 of 2")).toBeInTheDocument();
    await say("Okay naman");
    await say("Tapos na");
    await wait(100);
    const saved = JSON.parse(sessionStorage.getItem("amumata_result_tok") ?? "{}");
    expect(saved.checkIns).toEqual({ 0: { reason: "no_answer", outcome: "skipped" } });
    expect(saved.skipped).toEqual([0]);
  });

  test("head down while silent → a check-in sooner than silence alone", async () => {
    const face = (cy: number, wobble: number) => ({
      cy,
      height: 0.4,
      points: [
        { x: 0.4 + wobble, y: cy },
        { x: 0.6 + wobble, y: cy },
      ],
    });
    await startAndWarmUp();
    // The camera learns where the face usually is …
    for (let i = 0; i < 6; i += 1) {
      await wait(1000);
      faceCheck.onSighting?.(face(0.5, i % 2 ? 0.02 : 0), true);
    }
    await say("Oo");
    await wait(10);
    // … then the head goes down and stays down, in silence.
    for (let i = 0; i < 9; i += 1) {
      await wait(1000);
      faceCheck.onSighting?.(face(0.65, i % 2 ? 0.02 : 0), true);
    }
    await wait(600);
    expect(checkInSaid()).toBe(true); // ~9 s, well before the 13 s no-answer check-in
    fireEvent.click(screen.getByRole("button", { name: /Laktawan ang tanong/ }));
    await wait(10);
    await say("Tapos na");
    await wait(100);
    const saved = JSON.parse(sessionStorage.getItem("amumata_result_tok") ?? "{}");
    expect(saved.checkIns[0].reason).toBe("head_down");
  });

  test("at most once per question", async () => {
    await startAndWarmUp();
    await say("Oo");
    await wait(10);
    await wait(13500);
    await say("Oo");
    await wait(10);
    const before = spoken.filter((s) => s.startsWith(CHECK_IN_TL)).length;
    await wait(14000);
    expect(spoken.filter((s) => s.startsWith(CHECK_IN_TL)).length).toBe(before);
  });

  test("a question marked sensitive gets a gentle line first", async () => {
    link.questions = [{ text: "How have you been sleeping?", sensitive: true }, "What helps you relax?"];
    await startAndWarmUp();
    await say("Oo");
    await wait(10);
    expect(spoken).toContain("Mas personal ang susunod na tanong. Dahan-dahan lang, at okay lang na laktawan ito.");
    expect(spoken.indexOf("Mas personal ang susunod na tanong. Dahan-dahan lang, at okay lang na laktawan ito.")).toBeLessThan(
      spoken.lastIndexOf("How have you been sleeping?"),
    );
  });
});
