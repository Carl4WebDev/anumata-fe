import { useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, X } from "lucide-react";
import { fetchSystemHealth } from "../api/healthApi";

/**
 * The AI runs on Modal and sleeps when unused. After login, check it once:
 * the check itself wakes it (the backend starts it on a slow answer), and if
 * it's asleep, tell the therapist why AI features may take a moment.
 */

type AiState = "hidden" | "waking" | "ready" | "unavailable";

const RECHECK_MS = 15000;
const READY_NOTE_MS = 5000;
// Modal normally wakes in 1–3 min; stop re-checking well after that.
const GIVE_UP_MS = 10 * 60 * 1000;

export default function AiWakeBanner() {
  const [state, setState] = useState<AiState>("hidden");
  const stopRef = useRef<() => void>(() => {});

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const startedAt = Date.now();
    let wasWaking = false;
    const stop = () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
    stopRef.current = stop;

    const check = async () => {
      let aiStatus: string;
      try {
        aiStatus = (await fetchSystemHealth()).ai_service.status;
      } catch {
        return; // backend unreachable: the offline banner / page errors cover that
      }
      if (stopped) return;

      if (aiStatus === "ok") {
        if (!wasWaking) return; // already awake: nothing to say
        setState("ready");
        timer = setTimeout(() => !stopped && setState("hidden"), READY_NOTE_MS);
      } else if (aiStatus === "starting" && Date.now() - startedAt < GIVE_UP_MS) {
        wasWaking = true;
        setState("waking");
        timer = setTimeout(check, RECHECK_MS);
      } else {
        setState("unavailable");
      }
    };

    void check();
    return stop;
  }, []);

  if (state === "hidden") return null;

  const dismiss = () => {
    stopRef.current(); // the first check already woke the AI; no need to keep reminding
    setState("hidden");
  };

  if (state === "ready") {
    return (
      <div role="status" className="mb-4 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
        <CheckCircle2 size={16} className="shrink-0" />
        <span>AI is ready. AI features will now respond quickly.</span>
      </div>
    );
  }

  const waking = state === "waking";
  return (
    <div
      role="status"
      className={`mb-4 flex items-start gap-2 rounded-xl border px-4 py-3 text-sm ${
        waking ? "border-sky-200 bg-sky-50 text-sky-800" : "border-amber-200 bg-amber-50 text-amber-800"
      }`}
    >
      {waking ? (
        <Loader2 size={16} className="mt-0.5 shrink-0 animate-spin" />
      ) : (
        <AlertTriangle size={16} className="mt-0.5 shrink-0" />
      )}
      <span className="flex-1">
        {waking
          ? "AI is waking up — AI features (question builder, reports, interview analysis) may take 1–3 minutes to respond. Everything else works normally."
          : "AI features are unavailable right now. Everything else works normally; please try AI features again later."}
      </span>
      <button onClick={dismiss} aria-label="Dismiss" className="shrink-0 rounded p-0.5 opacity-70 transition hover:opacity-100">
        <X size={14} />
      </button>
    </div>
  );
}
