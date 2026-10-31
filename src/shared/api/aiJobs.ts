import { ApiError, httpClient, type ApiResponse } from "./httpClient";

/**
 * Slow AI requests (session report, longitudinal summary, question-set AI)
 * run on the server as background jobs: starting one answers at once with a
 * job id, then we poll until it's done. This way no host or proxy timeout can
 * cut off a request that takes minutes.
 */

interface AiJobStarted {
  job_id: string;
  status: string;
}

interface AiJobStatus<T> {
  job_id: string;
  status: "processing" | "completed" | "failed";
  result: T | null;
  error: { message: string; code: string } | null;
}

interface RunAiJobOptions {
  pollMs?: number;
  /** Stop waiting after this long (the server keeps the job for an hour). */
  maxWaitMs?: number;
}

const POLL_MS = 2000;
const MAX_WAIT_MS = 10 * 60 * 1000;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Start an AI job at `endpoint` and resolve with its result, shaped like a normal API response. */
export async function runAiJob<T>(
  endpoint: string,
  body?: unknown,
  { pollMs = POLL_MS, maxWaitMs = MAX_WAIT_MS }: RunAiJobOptions = {},
): Promise<ApiResponse<T>> {
  const started = await httpClient.post<AiJobStarted>(endpoint, body);
  const jobId = started.data.job_id;
  const deadline = Date.now() + maxWaitMs;

  for (;;) {
    await wait(pollMs);
    const { data: job } = await httpClient.get<AiJobStatus<T>>(`/api/ai-jobs/${encodeURIComponent(jobId)}`);
    if (job.status === "completed") {
      return { status: "success", message: "AI request complete", data: job.result as T };
    }
    if (job.status === "failed") {
      throw new ApiError(job.error?.message || "The AI request failed.", 502, job.error?.code);
    }
    if (Date.now() > deadline) {
      throw new ApiError("The AI is taking too long. Please try again later.", 504, "AI_JOB_TIMEOUT");
    }
  }
}
