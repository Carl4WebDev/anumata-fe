import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ProcessingPage from "../ProcessingPage";
import { emotionApi, StagedFilesMissingError, type AnalysisStatus, type EmotionResult } from "../../../../shared/api/emotionApi";
import { getFiles, deleteFiles } from "../../../../shared/utils/fileStorage";
import { describeProgress, formatElapsed } from "../../utils/analysisProgress";

vi.mock("../../../../shared/api/emotionApi", () => ({
  emotionApi: { startAnalysis: vi.fn(), analysisStatus: vi.fn() },
  StagedFilesMissingError: class StagedFilesMissingError extends Error {},
}));
vi.mock("../../../../shared/utils/fileStorage", () => ({ getFiles: vi.fn(), deleteFiles: vi.fn() }));

const api = vi.mocked(emotionApi);
const RESULT = { session_id: 1 } as unknown as EmotionResult;
const processing = (done: number, total = 8, elapsed_s = 30): AnalysisStatus => ({
  status: "processing",
  elapsed_s,
  progress: { stage: "answers", done, total },
});

async function tick(ms = 10) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/interview/tok/processing"]}>
      <Routes>
        <Route path="/interview/:token/processing" element={<ProcessingPage />} />
        <Route path="/interview/:token/results" element={<p>Results page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: false });
  vi.clearAllMocks();
  sessionStorage.clear();
  vi.mocked(getFiles).mockResolvedValue([{ name: "audio_0.webm", type: "audio/webm", blob: new Blob(["a"]) }]);
  vi.mocked(deleteFiles).mockResolvedValue();
  api.startAnalysis.mockResolvedValue();
});
afterEach(() => vi.useRealTimers());

describe("ProcessingPage", () => {
  test("shows real progress, then completion — however long it takes", async () => {
    api.analysisStatus
      .mockResolvedValueOnce(processing(0))
      .mockResolvedValueOnce(processing(5, 8, 420)) // 7 minutes in: still fine
      .mockResolvedValueOnce({ status: "completed", elapsed_s: 600, result: RESULT });
    renderPage();
    await tick();
    expect(screen.getByText("Analysing answer 1 of 8…")).toBeInTheDocument();

    await tick(3000);
    expect(screen.getByText("Analysing answer 6 of 8…")).toBeInTheDocument();
    expect(screen.getByText("Elapsed 7 min 00 s")).toBeInTheDocument();

    await tick(3000);
    expect(screen.getByText("All done — thank you!")).toBeInTheDocument();
    expect(JSON.parse(sessionStorage.getItem("amumata_analysis_tok")!)).toEqual(RESULT);
    expect(deleteFiles).toHaveBeenCalledWith("tok");
    fireEvent.click(screen.getByRole("button", { name: "View Results" }));
    expect(screen.getByText("Results page")).toBeInTheDocument();
  });

  test("a failed analysis explains it and can be retried without re-recording", async () => {
    api.analysisStatus
      .mockResolvedValueOnce({ status: "failed", elapsed_s: 40, error: { message: "ML service unavailable", code: "X" } })
      .mockResolvedValueOnce({ status: "completed", elapsed_s: 90, result: RESULT });
    renderPage();
    await tick();
    expect(screen.getByText("ML service unavailable")).toBeInTheDocument();
    expect(screen.getByText(/don't need to answer the questions again/)).toBeInTheDocument();
    expect(deleteFiles).not.toHaveBeenCalled(); // recordings kept for the retry

    fireEvent.click(screen.getByRole("button", { name: /Try again/ }));
    await tick();
    expect(api.startAnalysis).toHaveBeenCalledTimes(2);
    expect(screen.getByText("All done — thank you!")).toBeInTheDocument();
  });

  test("a server restart mid-analysis is reported, not waited on forever", async () => {
    api.analysisStatus.mockResolvedValueOnce(processing(1)).mockResolvedValueOnce({ status: "not_started" });
    renderPage();
    await tick();
    await tick(3000);
    expect(screen.getByText("The analysis was interrupted before it finished.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Try again/ })).toBeInTheDocument();
  });

  test("brief network hiccups keep waiting with a notice", async () => {
    api.analysisStatus
      .mockResolvedValueOnce(processing(2))
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce({ status: "completed", elapsed_s: 100, result: RESULT });
    renderPage();
    await tick();
    await tick(3000);
    expect(screen.getByText(/Connection hiccup/)).toBeInTheDocument();
    await tick(3000);
    expect(screen.getByText("All done — thank you!")).toBeInTheDocument();
  });

  test("answers uploaded early are not sent again", async () => {
    vi.mocked(getFiles).mockResolvedValueOnce([
      { name: "audio_0.webm", type: "audio/webm", blob: new Blob(["a"]) },
      { name: "audio_1.webm", type: "audio/webm", blob: new Blob(["b"]) },
    ]);
    sessionStorage.setItem("amumata_staged_tok", JSON.stringify(["audio_0.webm"]));
    api.analysisStatus.mockResolvedValue(processing(0));
    renderPage();
    await tick();
    const [, files, staged] = api.startAnalysis.mock.calls[0];
    expect(files.map((f) => f.name)).toEqual(["audio_1.webm"]);
    expect(staged).toEqual(["audio_0.webm"]);
  });

  test("if the server lost the early uploads, everything is sent again", async () => {
    sessionStorage.setItem("amumata_staged_tok", JSON.stringify(["audio_0.webm"]));
    api.startAnalysis.mockRejectedValueOnce(new StagedFilesMissingError());
    api.analysisStatus.mockResolvedValue(processing(0));
    renderPage();
    await tick();
    expect(api.startAnalysis).toHaveBeenCalledTimes(2);
    expect(api.startAnalysis.mock.calls[1][1].map((f) => f.name)).toEqual(["audio_0.webm"]);
    expect(screen.getByText("Analysing answer 1 of 8…")).toBeInTheDocument();
  });

  test("an upload error is shown with a retry", async () => {
    api.startAnalysis.mockRejectedValueOnce(new Error("Couldn't upload the interview"));
    renderPage();
    await tick();
    expect(screen.getByText("Couldn't upload the interview")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Try again/ })).toBeInTheDocument();
  });

  test("no recordings on this device → no pointless retry", async () => {
    vi.mocked(getFiles).mockResolvedValueOnce(null);
    renderPage();
    await tick();
    expect(screen.getByText(/No interview recordings were found/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Try again/ })).not.toBeInTheDocument();
  });
});

describe("describeProgress / formatElapsed", () => {
  test("labels each stage", () => {
    expect(describeProgress(processing(0, 4))).toEqual({ label: "Analysing answer 1 of 4…", percent: 0 });
    expect(describeProgress(processing(2, 4))).toEqual({ label: "Analysing answer 3 of 4…", percent: 45 });
    expect(describeProgress({ status: "processing", elapsed_s: 1, progress: { stage: "report", done: 4, total: 4 } }).label).toMatch(/summary/);
    expect(describeProgress({ status: "processing", elapsed_s: 1, progress: null })).toEqual({ label: "Analysing your answers…", percent: null });
  });

  test("formats elapsed time", () => {
    expect(formatElapsed(45)).toBe("45 s");
    expect(formatElapsed(185)).toBe("3 min 05 s");
  });
});
