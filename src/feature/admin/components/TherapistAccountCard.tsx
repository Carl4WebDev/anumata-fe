import { useState } from "react";
import { BadgeAlert, BadgeCheck, ChevronDown, ChevronUp, Clock, Copy, ExternalLink, Power, PowerOff } from "lucide-react";
import { adminApi, type AdminAction, type AdminTherapist } from "../../../shared/api/adminApi";
import { ApiError } from "../../../shared/api/httpClient";
import { PRC_VERIFICATION_URL, professionLabel } from "../../../shared/constants/professions";

const STATUS = {
  verified: { label: "Verified", icon: BadgeCheck, className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  pending: { label: "Pending", icon: Clock, className: "bg-amber-50 text-amber-800 border-amber-200" },
  not_matched: { label: "Not matched", icon: BadgeAlert, className: "bg-red-50 text-red-700 border-red-200" },
} as const;

const ACTION_LABELS: Record<AdminAction["action"], string> = {
  license_verified: "License verified",
  license_not_matched: "License not matched",
  deactivated: "Account deactivated",
  reactivated: "Account reactivated",
};

const btn = "flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition disabled:opacity-50";

function formatDate(value: string | null): string {
  return value ? new Date(value).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" }) : "—";
}

interface Props {
  therapist: AdminTherapist;
  onChanged: (updated: AdminTherapist) => void;
  onMessage: (text: string, kind: "success" | "error") => void;
}

/** One therapist account: details, PRC check actions, deactivation, and the action history. */
export default function TherapistAccountCard({ therapist: t, onChanged, onMessage }: Props) {
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<null | "not_matched" | "deactivate">(null);
  const [note, setNote] = useState("");
  const [history, setHistory] = useState<AdminAction[] | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const status = STATUS[t.license_status];
  const StatusIcon = status.icon;
  const fullName = [t.f_name, t.m_name, t.l_name].filter(Boolean).join(" ");
  const hasLicense = Boolean(t.profession && t.license_number && t.license_name);

  const run = async (action: () => Promise<{ data: AdminTherapist & { actions: AdminAction[] } }>, done: string) => {
    setBusy(true);
    try {
      const res = await action();
      onChanged(res.data);
      setHistory(res.data.actions);
      setMode(null);
      setNote("");
      onMessage(done, "success");
    } catch (err) {
      onMessage(err instanceof ApiError ? err.message : "Something went wrong.", "error");
    } finally {
      setBusy(false);
    }
  };

  const toggleHistory = async () => {
    const next = !showHistory;
    setShowHistory(next);
    if (next && history === null) {
      try {
        setHistory((await adminApi.getTherapist(t.user_id)).data.actions);
      } catch {
        setHistory([]);
      }
    }
  };

  const copyName = async () => {
    try {
      await navigator.clipboard.writeText(t.license_name ?? "");
      onMessage("Name on PRC ID copied.", "success");
    } catch {
      onMessage("Couldn't copy — select the name instead.", "error");
    }
  };

  return (
    <article className={`rounded-xl border bg-white p-4 shadow-sm md:p-5 ${t.is_active ? "border-slate-200" : "border-slate-300 bg-slate-50"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-slate-900">{fullName}</h3>
          <p className="truncate text-sm text-slate-500">{t.email}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!t.is_active && <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-medium text-slate-700">Deactivated</span>}
          <span className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${status.className}`}>
            <StatusIcon size={14} /> {status.label}
          </span>
        </div>
      </div>

      <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="text-xs text-slate-400">Profession</dt>
          <dd className="text-slate-800">{professionLabel(t.profession)}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-400">PRC license no.</dt>
          <dd className="font-mono text-slate-800">{t.license_number ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-slate-400">Name on PRC ID</dt>
          <dd className="flex items-center gap-1.5 text-slate-800">
            {t.license_name ?? "—"}
            {t.license_name && (
              <button onClick={copyName} className="text-slate-400 hover:text-teal-600" aria-label="Copy name on PRC ID" title="Copy">
                <Copy size={13} />
              </button>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-400">Joined · usage</dt>
          <dd className="text-slate-800">
            {new Date(t.created_at).toLocaleDateString("en-PH", { dateStyle: "medium" })} · {t.patient_count} patients · {t.interview_link_count} links
          </dd>
        </div>
      </dl>

      {t.license_checked_at && (
        <p className="mt-2 text-xs text-slate-500">
          Last checked {formatDate(t.license_checked_at)}
          {t.license_checked_by_email ? ` by ${t.license_checked_by_email}` : ""}
          {t.license_note ? ` — “${t.license_note}”` : ""}
        </p>
      )}
      {!hasLicense && <p className="mt-2 text-xs text-amber-700">No license details yet — the therapist is reminded daily to add them.</p>}

      <div className="mt-4 flex flex-wrap gap-2">
        <a href={PRC_VERIFICATION_URL} target="_blank" rel="noreferrer" className={`${btn} border border-slate-200 text-slate-700 hover:bg-slate-50`}>
          <ExternalLink size={14} /> Open PRC verification
        </a>
        <button
          disabled={busy || !hasLicense || t.license_status === "verified"}
          onClick={() => run(() => adminApi.setLicense(t.user_id, "verified"), `${fullName} marked as verified.`)}
          className={`${btn} bg-emerald-600 text-white hover:bg-emerald-700`}
        >
          <BadgeCheck size={14} /> Verified
        </button>
        <button
          disabled={busy || !hasLicense}
          onClick={() => setMode(mode === "not_matched" ? null : "not_matched")}
          className={`${btn} border border-red-200 text-red-700 hover:bg-red-50`}
        >
          <BadgeAlert size={14} /> Not matched
        </button>
        {t.is_active ? (
          <button disabled={busy} onClick={() => setMode(mode === "deactivate" ? null : "deactivate")} className={`${btn} border border-slate-200 text-slate-700 hover:bg-slate-50`}>
            <PowerOff size={14} /> Deactivate
          </button>
        ) : (
          <button
            disabled={busy}
            onClick={() => run(() => adminApi.setActive(t.user_id, true), `${fullName}'s account reactivated.`)}
            className={`${btn} bg-teal-600 text-white hover:bg-teal-700`}
          >
            <Power size={14} /> Reactivate
          </button>
        )}
        <button onClick={toggleHistory} className={`${btn} ml-auto text-slate-500 hover:text-slate-800`}>
          History {showHistory ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {mode && (
        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <label className="block text-xs font-medium text-slate-700" htmlFor={`note-${t.user_id}`}>
            {mode === "not_matched" ? "Reason (the therapist will see this)" : "Reason (optional, for the log)"}
          </label>
          <textarea
            id={`note-${t.user_id}`}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            maxLength={500}
            placeholder={mode === "not_matched" ? "e.g. No PRC record under this name and profession." : "e.g. Duplicate or test account."}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-teal-500"
          />
          <div className="mt-2 flex justify-end gap-2">
            <button onClick={() => setMode(null)} className={`${btn} text-slate-600 hover:bg-white`}>
              Cancel
            </button>
            {mode === "not_matched" ? (
              <button
                disabled={busy || !note.trim()}
                onClick={() => run(() => adminApi.setLicense(t.user_id, "not_matched", note), `${fullName} marked as not matched.`)}
                className={`${btn} bg-red-600 text-white hover:bg-red-700`}
              >
                Save "not matched"
              </button>
            ) : (
              <button
                disabled={busy}
                onClick={() => run(() => adminApi.setActive(t.user_id, false, note), `${fullName}'s account deactivated.`)}
                className={`${btn} bg-slate-800 text-white hover:bg-slate-900`}
              >
                Deactivate account
              </button>
            )}
          </div>
          {mode === "deactivate" && (
            <p className="mt-2 text-xs text-slate-500">They won't be able to log in. Their patients' data is kept, and you can reactivate the account anytime.</p>
          )}
        </div>
      )}

      {showHistory && (
        <ul className="mt-3 space-y-1.5 border-t border-slate-100 pt-3 text-xs text-slate-600">
          {history === null ? (
            <li>Loading…</li>
          ) : history.length === 0 ? (
            <li>No admin actions yet.</li>
          ) : (
            history.map((a) => (
              <li key={a.action_id}>
                <span className="font-medium text-slate-800">{ACTION_LABELS[a.action]}</span> · {formatDate(a.created_at)}
                {a.admin_email ? ` · ${a.admin_email}` : ""}
                {a.note ? ` — “${a.note}”` : ""}
              </li>
            ))
          )}
        </ul>
      )}
    </article>
  );
}
