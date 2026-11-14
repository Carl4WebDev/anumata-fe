import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, XCircle } from "lucide-react";
import { adminApi, type AdminUsage } from "../../../shared/api/adminApi";
import { fetchSystemHealth, type SystemHealth } from "../../../shared/api/healthApi";
import { ApiError } from "../../../shared/api/httpClient";

type Tone = "ok" | "wait" | "bad";

function StatusRow({ label, tone, text }: { label: string; tone: Tone; text: string }) {
  const Icon = tone === "ok" ? CheckCircle2 : tone === "wait" ? Loader2 : XCircle;
  const color = tone === "ok" ? "text-emerald-600" : tone === "wait" ? "text-amber-600" : "text-red-600";
  return (
    <li className="flex items-center justify-between gap-3 py-2 text-sm">
      <span className="text-slate-700">{label}</span>
      <span className={`flex items-center gap-1.5 font-medium ${color}`}>
        <Icon size={15} className={tone === "wait" ? "animate-spin" : ""} /> {text}
      </span>
    </li>
  );
}

/** Database, AI service (Modal) and each model. Checking also wakes a sleeping AI. */
function SystemStatus() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [failed, setFailed] = useState(false);
  const [checks, setChecks] = useState(0);
  const [checkedAt, setCheckedAt] = useState<Date | null>(null);
  const [doneCheck, setDoneCheck] = useState(-1);
  const checking = doneCheck !== checks;

  useEffect(() => {
    let cancelled = false;
    fetchSystemHealth()
      .then((h) => {
        if (cancelled) return;
        setHealth(h);
        setFailed(false);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      })
      .finally(() => {
        if (cancelled) return;
        setCheckedAt(new Date());
        setDoneCheck(checks);
      });
    return () => {
      cancelled = true;
    };
  }, [checks]);

  // While the AI wakes up on Modal (1–3 min), check again every 20 seconds.
  const starting = health?.ai_service.status === "starting";
  useEffect(() => {
    if (!starting || checking) return;
    const id = setTimeout(() => setChecks((n) => n + 1), 20_000);
    return () => clearTimeout(id);
  }, [starting, checking]);

  const ai = health?.ai_service;
  const aiTone: Tone = ai?.status === "ok" ? "ok" : ai?.status === "starting" ? "wait" : "bad";
  const aiText =
    ai?.status === "ok"
      ? "Running"
      : ai?.status === "starting"
        ? "Waking up…"
        : ai?.status === "degraded"
          ? "Running — some models missing"
          : ai?.status === "error"
            ? "Refused (check the AI service keys)"
            : "Not reachable";
  const ollamaText = (status: string | undefined) =>
    status === "model_missing" ? "Model not downloaded" : ai?.status === "starting" ? "Waking up…" : "Not available";
  const model = (loaded: boolean | undefined): [Tone, string] =>
    loaded ? ["ok", "Loaded"] : ai?.status === "starting" ? ["wait", "Loading…"] : ["bad", "Not loaded"];

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold text-slate-900">System status</h2>
          <p className="text-xs text-slate-500">
            {checkedAt ? `Checked ${checkedAt.toLocaleTimeString("en-PH", { timeStyle: "short" })}` : "Checking…"} · checking also wakes the AI
          </p>
        </div>
        <button
          onClick={() => setChecks((n) => n + 1)}
          disabled={checking}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw size={14} className={checking ? "animate-spin" : ""} /> Check now
        </button>
      </div>
      {failed && !health ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">Couldn't reach the backend.</p>
      ) : !health ? (
        <p className="py-4 text-sm text-slate-500">Checking…</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          <StatusRow label="Database" tone={health.database.status === "ok" ? "ok" : "bad"} text={health.database.status === "ok" ? "OK" : "Error"} />
          <StatusRow label="AI service (Modal)" tone={aiTone} text={aiText} />
          <StatusRow label="Face model (FER)" tone={model(ai?.models.fer)[0]} text={model(ai?.models.fer)[1]} />
          <StatusRow label="Voice model (SER)" tone={model(ai?.models.ser)[0]} text={model(ai?.models.ser)[1]} />
          <StatusRow label="Words model (LER)" tone={model(ai?.models.ler)[0]} text={model(ai?.models.ler)[1]} />
          <StatusRow label="Speech-to-text (Whisper)" tone={model(ai?.models.stt)[0]} text={model(ai?.models.stt)[1]} />
          <StatusRow
            label="Report AI (Ollama)"
            tone={health.ollama.status === "ok" ? "ok" : ai?.status === "starting" ? "wait" : "bad"}
            text={health.ollama.status === "ok" ? health.ollama.model ?? "Running" : ollamaText(health.ollama.status)}
          />
        </ul>
      )}
    </section>
  );
}

function Stat({ label, week, month, hint }: { label: string; week?: number | string; month: number | string; hint?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{month}</p>
      <p className="text-xs text-slate-500">
        {week !== undefined ? `${week} in the last 7 days · ` : ""}
        {hint ?? "last 30 days"}
      </p>
    </div>
  );
}

function minutes(seconds: number | null): string {
  if (seconds === null) return "—";
  return seconds < 90 ? `${seconds} sec` : `${(seconds / 60).toFixed(1)} min`;
}

/** Bars for analysed interviews per week. */
function WeeklyChart({ weekly }: { weekly: AdminUsage["weekly"] }) {
  const max = Math.max(1, ...weekly.map((w) => w.interviews));
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="font-semibold text-slate-900">Interviews analysed per week</h2>
      <p className="text-xs text-slate-500">Last 8 weeks</p>
      <div className="mt-4 flex h-40 items-end gap-2" role="img" aria-label="Interviews analysed per week">
        {weekly.map((w) => (
          <div key={w.week_start} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
            <span className="text-xs font-medium text-slate-700">{w.interviews}</span>
            <div className="w-full rounded-t-md bg-teal-500" style={{ height: `${(w.interviews / max) * 100}%`, minHeight: w.interviews ? 4 : 1 }} />
            <span className="text-[10px] text-slate-400">
              {new Date(`${w.week_start}T00:00:00`).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

/** Overview tab: system status, how the system is used, and problems to look at. Aggregate data only. */
export default function AdminOverview() {
  const [usage, setUsage] = useState<AdminUsage | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    adminApi
      .usage()
      .then((res) => {
        if (!cancelled) setUsage(res.data);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Couldn't load usage.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const c = usage?.counts;

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-2">
        <SystemStatus />
        {usage ? <WeeklyChart weekly={usage.weekly} /> : <section className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm">{error ?? "Loading…"}</section>}
      </div>

      {c && (
        <>
          <section>
            <h2 className="mb-3 font-semibold text-slate-900">How Amumata is used</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="Therapists" month={c.therapists} hint={`${c.therapists_verified} verified · ${c.therapists_new_30d} new this month`} />
              <Stat label="Interview links sent" week={c.links_sent_7d} month={c.links_sent_30d} />
              <Stat label="Interviews completed" week={c.interviews_completed_7d} month={c.interviews_completed_30d} />
              <Stat label="Links not used" month={c.links_unused} hint="expired, or unopened after 7 days" />
              <Stat label="AI analyses ready" week={c.analyses_ready_7d} month={c.analyses_ready_30d} />
              <Stat label="AI analyses failed" week={c.analyses_failed_7d} month={c.analyses_failed_30d} />
              <Stat label="Average time to results" month={minutes(c.avg_seconds_to_results_30d)} hint="interview end → results ready, last 30 days" />
              <Stat label="Appointments booked" week={c.appointments_7d} month={c.appointments_30d} hint={`last 30 days · ${c.follow_ups_30d} follow-ups`} />
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="flex items-center gap-2 font-semibold text-slate-900">
              <AlertTriangle size={16} className="text-amber-500" /> Recent analysis failures
            </h2>
            {usage.failures.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">None in the last 30 days.</p>
            ) : (
              <ul className="mt-2 divide-y divide-slate-100 text-sm">
                {usage.failures.map((f) => (
                  <li key={f.notification_id} className="flex flex-wrap justify-between gap-2 py-2">
                    <span className="text-slate-700">{f.therapist_email}</span>
                    <span className="text-slate-500">{new Date(f.created_at).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-xs text-slate-400">Several failures in a row usually mean the AI service needs attention.</p>
          </section>
        </>
      )}
    </div>
  );
}
