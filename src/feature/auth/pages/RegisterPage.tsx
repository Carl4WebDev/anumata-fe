import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useUser } from "../../context/users/useUser";

export default function RegisterPage() {
  const { register, loading, error } = useUser();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [localError, setLocalError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError("");

    if (password !== confirmPassword) {
      setLocalError("Passwords do not match");
      return;
    }

    const res = await register({ email, name, password });
    if (res?.ok) {
      navigate("/dashboard");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F1F5F9] px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-md border border-slate-200">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-12 h-12 rounded-2xl bg-cyan-500 flex items-center justify-center text-xl font-bold text-white">
            A
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Amumata</h1>
            <p className="text-sm text-slate-500">Create Account</p>
          </div>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="Dr. Maria Reyes"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="therapist@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="••••••••"
            />
          </div>

          {(localError || error) && (
            <p className="text-sm text-red-600 text-center">{localError || error}</p>
          )}

          <p className="text-center text-xs leading-5 text-slate-400">
            Simulated registration — no real account is created.
          </p>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>

          <Link to="/login">
            <div className="text-center text-sm text-blue-600 hover:underline">
              Already have an account? Login
            </div>
          </Link>
        </form>
      </div>
    </div>
  );
}
