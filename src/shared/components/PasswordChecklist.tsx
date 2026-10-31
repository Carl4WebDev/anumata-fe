import { Check, X } from "lucide-react";
import type { PasswordRule } from "../utils/passwordPolicy";

/** Live list of password rules; met rules turn green. */
export default function PasswordChecklist({ rules }: { rules: PasswordRule[] }) {
  return (
    <ul className="grid gap-1 text-xs sm:grid-cols-2" aria-label="Password requirements">
      {rules.map((rule) => (
        <li key={rule.id} className={`flex items-center gap-1.5 ${rule.ok ? "text-emerald-600" : "text-slate-400"}`}>
          {rule.ok ? <Check size={12} /> : <X size={12} />}
          {rule.label}
        </li>
      ))}
    </ul>
  );
}
