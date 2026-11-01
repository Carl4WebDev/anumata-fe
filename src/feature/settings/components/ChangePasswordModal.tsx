import { useState } from "react";
import { AlertTriangle, Eye, EyeOff, Lock } from "lucide-react";
import { authApi } from "../../../shared/api/authApi";
import PasswordChecklist from "../../../shared/components/PasswordChecklist";
import { passwordRules, type PasswordContext } from "../../../shared/utils/passwordPolicy";

interface ChangePasswordModalProps {
  /** Personal info the new password must not contain. */
  context: PasswordContext;
  onClose: () => void;
  onChanged: () => void;
}

const field =
  "w-full rounded-xl border border-slate-200 px-3 py-2 pr-10 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500";

function PasswordField({
  label,
  value,
  onChange,
  autoComplete,
  visible,
  onToggle,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
  visible: boolean;
  onToggle: () => void;
}) {
  return (
    <label className="block text-sm font-medium text-slate-600">
      {label}
      <span className="relative mt-1 block">
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          maxLength={128}
          className={field}
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600"
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </span>
    </label>
  );
}

export default function ChangePasswordModal({ context, onClose, onChanged }: ChangePasswordModalProps) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rules = passwordRules(next, context);
  const strong = rules.every((r) => r.ok);
  const matches = next.length > 0 && next === confirm;
  const sameAsCurrent = next.length > 0 && next === current;
  const canSubmit = !busy && current.length > 0 && strong && matches && !sameAsCurrent;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      await authApi.changePassword(current, next);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not change the password.");
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <form
        onSubmit={submit}
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-1 flex items-center gap-2 text-lg font-semibold text-[#08132E]">
          <Lock size={18} className="text-teal-600" /> Change password
        </h3>
        <p className="mb-4 text-sm text-slate-500">Enter your current password, then choose a strong new one.</p>

        <div className="space-y-3">
          <PasswordField label="Current password" value={current} onChange={setCurrent} autoComplete="current-password" visible={visible} onToggle={() => setVisible((v) => !v)} />
          <PasswordField label="New password" value={next} onChange={setNext} autoComplete="new-password" visible={visible} onToggle={() => setVisible((v) => !v)} />
          <PasswordChecklist rules={rules} />
          {sameAsCurrent && <p className="text-xs text-rose-600">The new password must be different from the current one.</p>}
          <PasswordField label="Confirm new password" value={confirm} onChange={setConfirm} autoComplete="new-password" visible={visible} onToggle={() => setVisible((v) => !v)} />
          {confirm.length > 0 && !matches && <p className="text-xs text-rose-600">Passwords don't match.</p>}
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={busy} className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {busy ? "Saving…" : "Change password"}
          </button>
        </div>
      </form>
    </div>
  );
}
