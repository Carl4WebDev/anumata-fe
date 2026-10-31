import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Check, Eye, EyeOff, FileText, X } from "lucide-react";
import { useUser } from "../../context/users/useUser";
import PasswordChecklist from "../../../shared/components/PasswordChecklist";
import { passwordRules } from "../../../shared/utils/passwordPolicy";
import AgreementModal from "../components/AgreementModal";
import AuthLayout from "../components/AuthLayout";
import AuthField from "../components/AuthField";
import { authInputClass as inputClass, authSubmitClass } from "../components/authStyles";
import { TERMS_VERSION } from "../agreement";

export default function RegisterPage() {
  const { register, loading, error } = useUser();
  const navigate = useNavigate();

  const [fName, setFName] = useState("");
  const [mName, setMName] = useState("");
  const [lName, setLName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [showAgreement, setShowAgreement] = useState(false);

  const rules = passwordRules(password, { email, names: [fName, mName, lName] });
  const passwordStrong = rules.every((rule) => rule.ok);
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError("");

    if (!agreed) {
      setLocalError("Please read and agree to the user agreement to create an account.");
      return;
    }
    if (!passwordStrong) {
      setLocalError("Please choose a stronger password — see the checklist under the password field.");
      return;
    }
    if (!passwordsMatch) {
      setLocalError("Passwords do not match.");
      return;
    }

    const res = await register({
      email,
      f_name: fName,
      m_name: mName || undefined,
      l_name: lName,
      password,
      accepted_terms: true,
      terms_version: TERMS_VERSION,
    });
    if (res?.ok) navigate("/dashboard");
  };

  const message = localError || error;

  return (
    <AuthLayout title="Create your therapist account" subtitle="Set up Amumata to run guided pre-evaluation interviews.">
      <form className="space-y-5" onSubmit={handleSubmit}>
        {/* Name */}
        <fieldset>
          <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Your name</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <AuthField id="reg-first" label="First name">
              <input id="reg-first" value={fName} onChange={(e) => setFName(e.target.value)} required maxLength={50} autoComplete="given-name" placeholder="Maria" className={inputClass} />
            </AuthField>
            <AuthField id="reg-last" label="Last name">
              <input id="reg-last" value={lName} onChange={(e) => setLName(e.target.value)} required maxLength={50} autoComplete="family-name" placeholder="Reyes" className={inputClass} />
            </AuthField>
            <div className="sm:col-span-2">
              <AuthField id="reg-middle" label="Middle name" hint="(optional)">
                <input id="reg-middle" value={mName} onChange={(e) => setMName(e.target.value)} maxLength={50} autoComplete="additional-name" placeholder="Santos" className={inputClass} />
              </AuthField>
            </div>
          </div>
        </fieldset>

        {/* Account */}
        <fieldset className="space-y-3">
          <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Account</legend>
          <AuthField id="reg-email" label="Email">
            <input id="reg-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" placeholder="therapist@email.com" className={inputClass} />
          </AuthField>

          <AuthField id="reg-password" label="Password">
            <div className="relative">
              <input
                id="reg-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                placeholder="Create a strong password"
                className={`${inputClass} pr-11`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 transition hover:text-slate-600"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {password.length > 0 && (
              <div className="mt-2 rounded-xl bg-slate-50 p-3">
                <PasswordChecklist rules={rules} />
              </div>
            )}
          </AuthField>

          <AuthField id="reg-confirm" label="Confirm password">
            <div className="relative">
              <input
                id="reg-confirm"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                placeholder="Type it again"
                className={`${inputClass} pr-11 ${confirmPassword && !passwordsMatch ? "border-rose-300 focus:border-rose-400 focus:ring-rose-400/20" : ""}`}
              />
              {confirmPassword && (
                <span className="absolute inset-y-0 right-0 flex items-center px-3" aria-hidden="true">
                  {passwordsMatch ? <Check size={18} className="text-emerald-500" /> : <X size={18} className="text-rose-400" />}
                </span>
              )}
            </div>
            {confirmPassword && !passwordsMatch && <p className="mt-1 text-xs text-rose-600">Passwords don&apos;t match yet.</p>}
          </AuthField>
        </fieldset>

        {/* User Consent and Agreement Validation */}
        <div className={`rounded-xl border p-4 transition ${agreed ? "border-teal-300 bg-teal-50" : "border-slate-200 bg-slate-50"}`}>
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-teal-600"
            />
            <span className="text-sm leading-relaxed text-slate-700">
              I have read and agree to the Amumata Terms of Use, Privacy Notice, and Responsible Use Agreement.
            </span>
          </label>
          <button
            type="button"
            onClick={() => setShowAgreement(true)}
            className="mt-1.5 inline-flex items-center gap-1 pl-7 text-sm font-semibold text-teal-700 hover:underline"
          >
            <FileText size={14} /> Read agreement
          </button>
        </div>

        {message && (
          <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">
            {message}
          </p>
        )}

        <button type="submit" disabled={loading || !agreed} className={authSubmitClass}>
          {loading ? "Creating account…" : "Create Account"}
        </button>

        <p className="text-center text-sm text-slate-600">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-teal-700 hover:underline">
            Log in
          </Link>
        </p>
      </form>

      {showAgreement && (
        <AgreementModal
          onClose={() => setShowAgreement(false)}
          onAgree={() => {
            setAgreed(true);
            setShowAgreement(false);
          }}
        />
      )}
    </AuthLayout>
  );
}
