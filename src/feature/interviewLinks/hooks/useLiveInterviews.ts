import { useEffect, useState } from "react";
import { liveApi, type LiveInterview } from "../../../shared/api/liveApi";

const POLL_MS = 15_000;

/** The therapist's interviews with the patient in the room right now, refreshed every 15 seconds. */
export function useLiveInterviews(): Map<number, LiveInterview> {
  const [live, setLive] = useState<Map<number, LiveInterview>>(new Map());

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      liveApi
        .status()
        .then((res) => {
          if (!cancelled) setLive(new Map(res.data.live.map((l) => [l.interview_link_id, l])));
        })
        .catch(() => {});
    void load();
    const timer = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  return live;
}
