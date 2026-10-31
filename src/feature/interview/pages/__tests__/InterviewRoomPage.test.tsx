import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import InterviewRoom from "../InterviewRoomPage";
import type { CaptionPhrase, CaptionActivity } from "../../hooks/useLiveCaptions";

// ─── Fakes: voice out (TTS), voice in (captions), media, APIs ───

const spoken: string[] = [];
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

vi.mock("../../../../shared/api/interviewLinksApi", () => ({
  interviewLinksApi: {
    getByToken: () =>
      Promise.resolve({
        data: {
          questions: ["How have you been sleeping?", "What helps you relax?"],
          patient_name: "Maria",
          question_set_name: "Intake",
        },
      }),
  },
}));
vi.mock("../../../../shared/api/translateApi", () => ({ translateQuestion: () => Promise.resolve(null) }));
const stageFiles = vi.fn().mockResolvedValue(undefined);
vi.mock("../../../../shared/api/emotionApi", () => ({
  emotionApi: { stageFiles: (...args: unknown[]) => stageFiles(...args) },
}));
const storeFiles = vi.fn().mockResolvedValue(undefined);
vi.mock("../../../../shared/utils/fileStorage", () => ({ storeFiles: (...args: unknown[]) => storeFiles(...args) }));

class FakeRecorder {
  state = "inactive";
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  start() {
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

async function wait(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
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
  mic.turn = 0;
  mic.activity = { lastVoiceAt: null, voiceActive: false, pending: 0 };
  storeFiles.mockClear();
  stageFiles.mockClear();
  sessionStorage.clear();
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
    await wait(15500); // thinking time, then "Gusto mo na bang lumipat…?"
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
    expect(storeFiles).toHaveBeenCalled();
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
