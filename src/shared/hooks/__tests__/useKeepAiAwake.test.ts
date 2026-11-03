import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useKeepAiAwake, KEEP_AWAKE_MS } from "../useKeepAiAwake";

const fetchSystemHealth = vi.fn();
vi.mock("../../api/healthApi", () => ({ fetchSystemHealth: () => fetchSystemHealth() }));

beforeEach(() => {
  vi.useFakeTimers();
  fetchSystemHealth.mockReset().mockResolvedValue({});
});
afterEach(() => vi.useRealTimers());

describe("useKeepAiAwake", () => {
  test("wakes the AI right away, then checks every few minutes until left", () => {
    const { unmount } = renderHook(() => useKeepAiAwake());
    expect(fetchSystemHealth).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(KEEP_AWAKE_MS);
    expect(fetchSystemHealth).toHaveBeenCalledTimes(2);
    unmount();
    vi.advanceTimersByTime(KEEP_AWAKE_MS * 3);
    expect(fetchSystemHealth).toHaveBeenCalledTimes(2);
  });

  test("does nothing when not active, and a failed check is ignored", () => {
    renderHook(() => useKeepAiAwake(false));
    expect(fetchSystemHealth).not.toHaveBeenCalled();
    fetchSystemHealth.mockRejectedValue(new Error("offline"));
    expect(() => renderHook(() => useKeepAiAwake())).not.toThrow();
  });
});
