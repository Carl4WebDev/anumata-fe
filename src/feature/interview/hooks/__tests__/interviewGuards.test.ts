import { describe, test, expect, vi, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useLeaveWarning, useScreenWakeLock } from "../interviewGuards";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("useLeaveWarning", () => {
  test("asks the browser to confirm closing or refreshing during the interview", () => {
    renderHook(() => useLeaveWarning(true));
    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  test("doesn't warn when the interview isn't running", () => {
    renderHook(() => useLeaveWarning(false));
    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });

  test("back button: staying keeps the patient on the page", () => {
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const back = vi.spyOn(window.history, "back").mockImplementation(() => {});
    renderHook(() => useLeaveWarning(true));
    const entries = window.history.length;

    window.dispatchEvent(new PopStateEvent("popstate"));

    expect(window.confirm).toHaveBeenCalled();
    expect(back).not.toHaveBeenCalled();
    expect(window.history.length).toBe(entries + 1); // guard entry restored
  });

  test("back button: confirming leaves", () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const back = vi.spyOn(window.history, "back").mockImplementation(() => {});
    renderHook(() => useLeaveWarning(true));

    window.dispatchEvent(new PopStateEvent("popstate"));

    expect(back).toHaveBeenCalledTimes(1);
  });

  test("stops guarding once the interview ends", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const { rerender } = renderHook(({ active }) => useLeaveWarning(active), { initialProps: { active: true } });
    rerender({ active: false });
    window.dispatchEvent(new PopStateEvent("popstate"));
    expect(confirm).not.toHaveBeenCalled();
  });
});

describe("useScreenWakeLock", () => {
  function stubWakeLock() {
    const release = vi.fn(() => Promise.resolve());
    const request = vi.fn(() => Promise.resolve({ release }));
    vi.stubGlobal("navigator", { ...navigator, wakeLock: { request } });
    return { request, release };
  }

  test("keeps the screen on during the interview and lets it sleep after", async () => {
    const { request, release } = stubWakeLock();
    const { rerender } = renderHook(({ active }) => useScreenWakeLock(active), { initialProps: { active: true } });
    await waitFor(() => expect(request).toHaveBeenCalledWith("screen"));

    rerender({ active: false });
    await waitFor(() => expect(release).toHaveBeenCalled());
  });

  test("asks again when the patient comes back to the tab", async () => {
    const { request } = stubWakeLock();
    renderHook(() => useScreenWakeLock(true));
    await waitFor(() => expect(request).toHaveBeenCalledTimes(1));

    document.dispatchEvent(new Event("visibilitychange"));
    await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
  });

  test("does nothing on browsers without wake lock", () => {
    vi.stubGlobal("navigator", { ...navigator, wakeLock: undefined });
    expect(() => renderHook(() => useScreenWakeLock(true))).not.toThrow();
  });
});
