import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import AiWakeBanner from "./AiWakeBanner";
import { fetchSystemHealth, type SystemHealth } from "../api/healthApi";

vi.mock("../api/healthApi", () => ({ fetchSystemHealth: vi.fn() }));
const fetchHealth = vi.mocked(fetchSystemHealth);

const health = (aiStatus: string): SystemHealth => ({
  status: aiStatus === "ok" ? "ok" : aiStatus === "starting" ? "starting" : "degraded",
  express: { status: "ok" },
  database: { status: "ok" },
  ai_service: { status: aiStatus, models: { fer: true, ser: true, ler: true, stt: true } },
  ollama: { status: aiStatus === "ok" ? "ok" : aiStatus, model: null },
  timestamp: "",
});

async function flush(ms = 0) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  fetchHealth.mockReset();
});
afterEach(() => vi.useRealTimers());

describe("AiWakeBanner", () => {
  test("AI already awake: nothing is shown", async () => {
    fetchHealth.mockResolvedValue(health("ok"));
    render(<AiWakeBanner />);
    await flush();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  test("AI asleep: explains the wait, re-checks, then says it's ready and goes away", async () => {
    fetchHealth.mockResolvedValueOnce(health("starting")).mockResolvedValueOnce(health("starting")).mockResolvedValue(health("ok"));
    render(<AiWakeBanner />);
    await flush();
    expect(screen.getByRole("status")).toHaveTextContent(/AI is waking up/);
    expect(screen.getByRole("status")).toHaveTextContent(/1–3 minutes/);

    await flush(15000); // still starting
    expect(screen.getByRole("status")).toHaveTextContent(/waking up/);

    await flush(15000); // ready
    expect(screen.getByRole("status")).toHaveTextContent(/AI is ready/);
    expect(fetchHealth).toHaveBeenCalledTimes(3);

    await flush(6000); // the "ready" note fades out
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  test("can be dismissed while waiting", async () => {
    fetchHealth.mockResolvedValue(health("starting"));
    render(<AiWakeBanner />);
    await flush();
    fireEvent.click(screen.getByRole("button", { name: /Dismiss/ }));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  test("AI down (not just asleep): says AI features are unavailable for now", async () => {
    fetchHealth.mockResolvedValue(health("unreachable"));
    render(<AiWakeBanner />);
    await flush();
    expect(screen.getByRole("status")).toHaveTextContent(/AI features are unavailable/);
  });

  test("the backend itself unreachable: stays quiet (the offline banner covers that)", async () => {
    fetchHealth.mockRejectedValue(new Error("Failed to fetch"));
    render(<AiWakeBanner />);
    await flush();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
