import { Heart } from "lucide-react";
import { CRISIS_HOTLINES } from "../hooks/crisisDetection";

/** Always shown at the end of an interview: who to call if the patient needs to talk to someone now. */
export default function HelpLines() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 text-left">
      <div className="flex items-start gap-3">
        <Heart size={20} className="mt-0.5 shrink-0 text-teal-600" />
        <div className="min-w-0">
          <p className="font-semibold text-slate-900">Need to talk to someone now?</p>
          <p className="mt-1 text-sm leading-relaxed text-slate-500">
            You don&apos;t have to wait for your session. These lines are free and open any time:
          </p>
          <ul className="mt-3 space-y-1.5">
            {CRISIS_HOTLINES.map((line) => (
              <li key={line.name} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                <span className="font-medium text-slate-700">{line.name}:</span>
                {line.numbers.map((n) => (
                  <a
                    key={n.tel}
                    href={`tel:${n.tel}`}
                    className="rounded-md bg-teal-50 px-2 py-0.5 font-mono text-teal-800 transition hover:bg-teal-100"
                  >
                    {n.label}
                  </a>
                ))}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-slate-400">In an emergency, call 911.</p>
        </div>
      </div>
    </div>
  );
}
