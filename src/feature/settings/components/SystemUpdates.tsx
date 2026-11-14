import { useState } from "react";
import { ChevronDown, ChevronRight, Sparkles, Wrench } from "lucide-react";
import { updatesFor, type SystemUpdate, type UpdatesAudience } from "../data/systemUpdates";

function formatDate(date: string): string {
  return new Date(`${date}T12:00:00+08:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function UpdateEntry({ update, defaultOpen, audience }: { update: SystemUpdate; defaultOpen: boolean; audience: UpdatesAudience }) {
  const [open, setOpen] = useState(defaultOpen);
  const count = update.groups.reduce((n, g) => n + g.changes.length, 0);
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-start justify-between gap-3 text-left" aria-expanded={open}>
        <div>
          <p className="text-xs font-medium text-teal-700">{formatDate(update.date)}</p>
          <p className="font-semibold text-slate-900">{update.title}</p>
          <p className="text-xs text-slate-400">{count} changes</p>
        </div>
        {open ? <ChevronDown size={16} className="mt-1 text-slate-400" /> : <ChevronRight size={16} className="mt-1 text-slate-400" />}
      </button>
      {open && (
        <div className="mt-3 space-y-4 border-t border-slate-100 pt-3">
          {update.groups.map((g) => (
            <div key={g.area}>
              <p className="mb-1 flex items-center gap-2 text-sm font-semibold text-slate-800">
                {g.area}
                {audience === "admin" && g.audience === "admin" && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">admin only</span>
                )}
              </p>
              <ul className="space-y-1 text-sm text-slate-600">
                {g.changes.map((c) => (
                  <li key={c} className="flex gap-2">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-teal-500" />
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {update.deploySteps && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-amber-800">
                <Wrench size={13} /> Before it works on the live server
              </p>
              <ol className="list-inside list-decimal space-y-0.5 text-xs text-amber-900">
                {update.deploySteps.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** What changed in the system, newest first. */
export default function SystemUpdates({ audience = "therapist" }: { audience?: UpdatesAudience }) {
  const updates = updatesFor(audience);
  return (
    <div>
      <div className="mb-1 flex items-center gap-2">
        <Sparkles size={18} className="text-teal-600" />
        <h2 className="text-base font-semibold text-slate-900">What&apos;s New</h2>
      </div>
      <p className="mb-4 text-sm text-slate-500">
        {audience === "admin"
          ? "Every change to Amumata, newest first, with the steps needed on the live server."
          : "Recent changes that affect your work, newest first."}
      </p>
      <div className="space-y-3">
        {updates.map((u, i) => (
          <UpdateEntry key={u.date + u.title} update={u} defaultOpen={i === 0} audience={audience} />
        ))}
      </div>
    </div>
  );
}
