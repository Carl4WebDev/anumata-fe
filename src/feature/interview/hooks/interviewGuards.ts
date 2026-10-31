import { useEffect } from "react";

/**
 * Keep a running interview from being lost by accident.
 */

const LEAVE_MESSAGE = "Leave the interview? Your answers so far will be lost.";

/**
 * While `active`: closing / refreshing the tab asks the browser's "Leave site?"
 * question, and the back button asks before leaving. (The app uses
 * BrowserRouter, which has no navigation blocker, so back is caught with an
 * extra history entry.)
 */
export function useLeaveWarning(active: boolean) {
  useEffect(() => {
    if (!active) return;

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = ""; // older browsers need this to show the prompt
    };
    // Back pops this guard entry first, so we can ask before really leaving.
    const guard = () => window.history.pushState(window.history.state, "", window.location.href);
    const onPopState = () => {
      if (window.confirm(LEAVE_MESSAGE)) {
        window.removeEventListener("popstate", onPopState);
        window.history.back();
      } else {
        guard();
      }
    };

    guard();
    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("popstate", onPopState);
    };
  }, [active]);
}

/**
 * While `active`, stop the screen from dimming and locking (phones sleep during
 * long answers, which can stop the camera and mic). Browsers drop the lock when
 * the tab is hidden, so it's asked for again on return. No-op where unsupported.
 */
export function useScreenWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !navigator.wakeLock) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;

    const request = () => {
      navigator.wakeLock
        .request("screen")
        .then((sentinel) => {
          if (cancelled) void sentinel.release();
          else lock = sentinel;
        })
        .catch(() => {
          /* denied (e.g. battery saver) — the interview still works */
        });
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") request();
    };

    request();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      lock?.release().catch(() => {});
    };
  }, [active]);
}
