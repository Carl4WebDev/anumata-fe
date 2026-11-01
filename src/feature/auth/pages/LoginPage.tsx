import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { useUser } from "../../context/users/useUser";
import AuthLayout from "../components/AuthLayout";
import AuthField from "../components/AuthField";
import { authInputClass as inputClass, authSubmitClass } from "../components/authStyles";

export default function LoginPage() {
  const { login, loading, error } = useUser();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await login(email, password);
    if (res?.ok) navigate("/dashboard");
  };

  return (
    <AuthLayout title="Welcome back" subtitle="Log in to your Amumata therapist portal.">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <AuthField id="login-email" label="Email">
          <input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            autoFocus
            placeholder="therapist@email.com"
            className={inputClass}
          />
        </AuthField>

        <AuthField id="login-password" label="Password">
          <div className="relative">
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="Your password"
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
        </AuthField>

        {error && (
          <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">
            {error}
          </p>
        )}

        <button type="submit" disabled={loading} className={`${authSubmitClass} mt-2 flex items-center justify-center gap-2`}>
          {loading ? (
            "Logging in…"
          ) : (
            <>
              <LogIn size={16} /> Log in
            </>
          )}
        </button>

        <div className="relative py-2">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-slate-200" />
          </div>
          <p className="relative mx-auto w-fit bg-white px-3 text-xs text-slate-400">New to Amumata?</p>
        </div>

        <Link
          to="/register"
          className="flex w-full items-center justify-center rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-700 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700"
        >
          Create a therapist account
        </Link>
      </form>
    </AuthLayout>
  );
}
