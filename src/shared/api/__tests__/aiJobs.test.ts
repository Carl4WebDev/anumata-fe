import { describe, it, expect, vi, afterEach } from "vitest";
import { runAiJob } from "../aiJobs";
import { ApiError } from "../httpClient";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

/** fetch that answers each call with the next response in the list. */
function mockFetchSequence(responses: Response[]) {
  const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => responses.shift() ?? json({ message: "no more" }, 500));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const started = () => json({ status: "success", message: "AI request started", data: { job_id: "j1", status: "processing" } }, 202);
const status = (data: object) => json({ status: "success", message: "", data: { job_id: "j1", result: null, error: null, ...data } });
const noWait = { pollMs: 0 };

afterEach(() => vi.unstubAllGlobals());

describe("runAiJob", () => {
  it("starts the job, polls until it's done, and returns the result like a normal response", async () => {
    const fetchMock = mockFetchSequence([
      started(),
      status({ status: "processing" }),
      status({ status: "completed", result: { session_summary: "Calm" } }),
    ]);

    const res = await runAiJob<{ session_summary: string }>("/api/sessions/5/regenerate-report", undefined, noWait);

    expect(res.data).toEqual({ session_summary: "Calm" });
    expect(fetchMock.mock.calls.map((c) => String(c[0]))).toEqual([
      expect.stringContaining("/api/sessions/5/regenerate-report"),
      expect.stringContaining("/api/ai-jobs/j1"),
      expect.stringContaining("/api/ai-jobs/j1"),
    ]);
  });

  it("sends the request body when starting", async () => {
    const fetchMock = mockFetchSequence([started(), status({ status: "completed", result: {} })]);
    await runAiJob("/api/question-sets/ai/refine", { question_text: "How are you?" }, noWait);
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: "POST", body: JSON.stringify({ question_text: "How are you?" }) });
  });

  it("throws the job's error message when the AI fails", async () => {
    mockFetchSequence([
      started(),
      status({ status: "failed", error: { message: "AI question review is currently unavailable.", code: "AI_UNAVAILABLE" } }),
    ]);
    const err = await runAiJob("/api/question-sets/ai/review", { questions: [] }, noWait).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.message).toBe("AI question review is currently unavailable.");
    expect(err.code).toBe("AI_UNAVAILABLE");
  });

  it("a rejected start (e.g. missing title) fails right away", async () => {
    mockFetchSequence([json({ status: "error", message: "Title is required", code: "MISSING_TITLE" }, 400)]);
    await expect(runAiJob("/api/question-sets/ai/generate", {}, noWait)).rejects.toThrow("Title is required");
  });

  it("gives up after the maximum wait", async () => {
    mockFetchSequence([started(), ...Array.from({ length: 10 }, () => status({ status: "processing" }))]);
    await expect(runAiJob("/api/patients/1/longitudinal-report", undefined, { pollMs: 0, maxWaitMs: -1 })).rejects.toThrow(
      /taking too long/i,
    );
  });
});
