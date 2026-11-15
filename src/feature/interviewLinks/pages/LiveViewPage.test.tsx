import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import LiveViewPage from "./LiveViewPage";
import { eventsBetween, type LiveStatus, type LiveEvent } from "../hooks/useLiveWatch";
import type { LiveInterviewState } from "../../../shared/api/liveApi";

let watch: { status: LiveStatus; state: LiveInterviewState; patientName: string; media: MediaStream | null; events: LiveEvent[] };
vi.mock("../hooks/useLiveWatch", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../hooks/useLiveWatch")>()),
  useLiveWatch: () => watch,
}));

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={["/interview-links/7/live"]}>
      <Routes>
        <Route path="/interview-links/:id/live" element={<LiveViewPage />} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  watch = { status: "connecting", state: {}, patientName: "", media: null, events: [] };
});

describe("eventsBetween", () => {
  const at = "2026-11-14T03:00:00Z";
  test("questions, check-ins, breaks and crisis become events", () => {
    const prev: LiveInterviewState = { stage: "interview", questionIndex: 0, questionTotal: 5 };
    expect(eventsBetween(prev, { ...prev, questionIndex: 1 }, at)).toEqual([{ at, text: "Question 2 of 5", tone: "info" }]);
    expect(eventsBetween(prev, { ...prev, checkIn: true }, at)[0].tone).toBe("warn");
    expect(eventsBetween(prev, { ...prev, onBreak: true }, at)[0].text).toMatch(/break/);
    expect(eventsBetween(prev, { ...prev, crisis: true }, at)[0].tone).toBe("alert");
    expect(eventsBetween(prev, { ...prev }, at)).toEqual([]);
  });

  test("starting the questions is announced once", () => {
    expect(eventsBetween({ stage: "warmup" }, { stage: "interview", questionIndex: 0 }, at)).toEqual([
      { at, text: "The interview questions started", tone: "info" },
    ]);
  });

  test("support mode: when it starts, each line Amumata says, and the patient's choice", () => {
    const prev: LiveInterviewState = { stage: "interview", questionIndex: 0, crisis: true };
    const opening = { ...prev, support: { active: true, lastLine: "Thank you for telling me this.", lineCount: 1 } };
    expect(eventsBetween(prev, opening, at).map((e) => e.text)).toEqual([
      "Support mode: Amumata paused the questions and is keeping the patient company",
      "Amumata said: “Thank you for telling me this.”",
    ]);
    const gentle = { ...prev, support: { active: true, lastLine: "Take your time.", lineCount: 2 } };
    expect(eventsBetween(opening, gentle, at).map((e) => e.text)).toEqual(["Amumata said: “Take your time.”"]);
    expect(eventsBetween(gentle, { ...gentle }, at)).toEqual([]);
    const chose = { ...prev, support: { active: false, choice: "break" as const } };
    expect(eventsBetween(gentle, chose, at).map((e) => e.text)).toEqual(["The patient chose to take a break"]);
  });
});

describe("LiveViewPage", () => {
  test("waiting for the patient", () => {
    watch.status = "waiting";
    renderPage();
    expect(screen.getByRole("status")).toHaveTextContent("Waiting for the patient");
    expect(screen.getByText(/video appears here when the patient is in the interview room/)).toBeInTheDocument();
  });

  test("live: shows the patient, the current question, captions and events", () => {
    watch = {
      status: "live",
      patientName: "MARIA SANTOS",
      media: null,
      state: { stage: "interview", questionIndex: 2, questionTotal: 10, question: "How have you been sleeping?", caption: "Hindi masyado" },
      events: [{ at: "2026-11-14T03:00:00Z", text: "Amumata checked in: “Okay ka pa ba mopadayon?”", tone: "warn" }],
    };
    renderPage();
    expect(screen.getByRole("heading", { name: "Watching MARIA SANTOS" })).toBeInTheDocument();
    expect(screen.getByText("Question 3 of 10")).toBeInTheDocument();
    expect(screen.getByText("How have you been sleeping?")).toBeInTheDocument();
    expect(screen.getByText("Hindi masyado")).toBeInTheDocument();
    expect(screen.getByText(/Okay ka pa ba mopadayon/)).toBeInTheDocument();
    expect(screen.getByText(/Connecting to the patient's camera/)).toBeInTheDocument();
  });

  test("phrases that couldn't be transcribed are noted instead of leaving a silent gap", () => {
    watch = { ...watch, status: "live", state: { stage: "interview", questionIndex: 0, caption: "Okay naman", captionGaps: 2 } };
    renderPage();
    expect(screen.getByText(/2 phrases couldn't be transcribed/)).toBeInTheDocument();
  });

  test("a crisis is shown prominently", () => {
    watch = { ...watch, status: "live", state: { stage: "interview", questionIndex: 0, crisis: true } };
    renderPage();
    expect(screen.getByText(/Crisis alert — the patient may be at risk/)).toBeInTheDocument();
    expect(screen.queryByText("Support mode — questions paused")).not.toBeInTheDocument();
  });

  test("support mode shows a banner while it's on", () => {
    watch = { ...watch, status: "live", state: { stage: "interview", questionIndex: 0, crisis: true, support: { active: true, lineCount: 1 } } };
    renderPage();
    expect(screen.getByText("Support mode — questions paused")).toBeInTheDocument();
    expect(screen.getByText(/The patient sees that you are watching/)).toBeInTheDocument();
  });

  test("someone else's interview can't be watched", () => {
    watch.status = "denied";
    renderPage();
    expect(screen.getByRole("status")).toHaveTextContent("You can't watch this interview");
  });
});
