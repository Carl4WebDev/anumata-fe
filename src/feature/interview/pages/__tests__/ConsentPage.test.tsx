import { describe, test, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ConsentPage from "../ConsentPage";

const getByToken = vi.fn();
// The AI wake-up check (no real network in tests).
const fetchSystemHealth = vi.fn().mockResolvedValue({});
vi.mock("../../../../shared/api/healthApi", () => ({ fetchSystemHealth: () => fetchSystemHealth() }));

vi.mock("../../../../shared/api/interviewLinksApi", () => ({
  interviewLinksApi: { getByToken: (token: string) => getByToken(token) },
}));
const questions = (n: number) => ({ data: { questions: Array.from({ length: n }, (_, i) => ({ text: `Q${i}`, order: i })) } });

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={["/interview/tok/consent"]}>
      <Routes>
        <Route path="/interview/:token/consent" element={<ConsentPage />} />
      </Routes>
    </MemoryRouter>,
  );

describe("ConsentPage — number of questions", () => {
  test("shows how many questions this interview really has", async () => {
    getByToken.mockResolvedValue(questions(12));
    renderPage();
    expect(await screen.findByText(/You will be asked 12 questions prepared by your therapist/)).toBeInTheDocument();
    expect(getByToken).toHaveBeenCalledWith("tok");
  });

  test("says 'question' for a single question", async () => {
    getByToken.mockResolvedValue(questions(1));
    renderPage();
    expect(await screen.findByText(/You will be asked 1 question prepared/)).toBeInTheDocument();
  });

  test("falls back to general wording if the link can't be loaded", async () => {
    getByToken.mockRejectedValue(new Error("offline"));
    renderPage();
    expect(await screen.findByText(/You will be asked a few questions prepared by your therapist/)).toBeInTheDocument();
  });
});

describe("ConsentPage — live captions notice", () => {
  beforeEach(() => getByToken.mockResolvedValue(questions(6)));
  afterEach(() => vi.unstubAllEnvs());

  test("by default, says the voice goes to Google or Microsoft for captions", () => {
    renderPage();
    expect(screen.getByText(/sends your voice to Google or Microsoft/i)).toBeInTheDocument();
  });

  test("with browser captions turned off, says the voice stays on Amumata's own server", () => {
    vi.stubEnv("VITE_CAPTION_ENGINE", "whisper");
    renderPage();
    expect(screen.getByText(/not sent to Google or Microsoft/i)).toBeInTheDocument();
    expect(screen.queryByText(/sends your voice to Google or Microsoft/i)).not.toBeInTheDocument();
  });
});

describe("ConsentPage — waking the AI", () => {
  test("starts waking the AI as soon as the patient opens their link", () => {
    getByToken.mockResolvedValue(questions(3));
    fetchSystemHealth.mockClear();
    renderPage();
    expect(fetchSystemHealth).toHaveBeenCalledTimes(1);
  });
});
