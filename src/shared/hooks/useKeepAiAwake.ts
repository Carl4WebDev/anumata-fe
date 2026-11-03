import { useEffect } from "react";
import { fetchSystemHealth } from "../api/healthApi";

// The hosted AI sleeps after 5 idle minutes; a check every 3 keeps it awake.
export const KEEP_AWAKE_MS = 3 * 60 * 1000;

/**
 * While the patient is on the consent page and in the interview, keep the AI
 * awake: the health check wakes it if it's asleep, and the regular checks stop
 * it falling asleep again — so the analysis starts right away when they finish
 * instead of waiting for a cold start. Failures are ignored (it's only a nudge).
 */
export function useKeepAiAwake(active = true): void {
  useEffect(() => {
    if (!active) return;
    const ping = () => {
      fetchSystemHealth().catch(() => {});
    };
    ping();
    const id = setInterval(ping, KEEP_AWAKE_MS);
    return () => clearInterval(id);
  }, [active]);
}
