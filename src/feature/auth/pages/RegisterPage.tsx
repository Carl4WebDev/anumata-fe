import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useUser } from "../../context/users/useUser";

export default function RegisterPage() {
  const { register, loading, error } = useUser();
  const navigate = useNavigate();

  const [fName, setFName] = useState("");
  const [mName, setMName] = useState("");
  const [lName, setLName] = useState("");
  const [email, setEmail] = useState("");
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

    const res = await register({ email, f_name: fName, m_name: mName || undefined, l_name: lName, password });
    if (res?.ok) {
      navigate("/dashboard");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F1F5F9] px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-md border border-slate-200">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-12 h-12 rounded-xl bg-teal-500 flex items-center justify-center text-xl font-bold text-white">
            A
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Anumata</h1>
            <p className="text-sm text-slate-500">Create Account</p>
          </div>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
              <input
                type="text"
                value={fName}
                onChange={(e) => setFName(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                placeholder="Maria"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
              <input
                type="text"
                value={lName}
                onChange={(e) => setLName(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                placeholder="Reyes"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Middle Name <span className="text-slate-400">(optional)</span></label>
            <input
              type="text"
              value={mName}
              onChange={(e) => setMName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              placeholder="Santos"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
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
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
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
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              placeholder="••••••••"
            />
          </div>

          {(localError || error) && (
            <p className="text-sm text-red-600 text-center">{localError || error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-teal-600 py-3 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-60"
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>

          <Link to="/login">
            <div className="text-center text-sm text-teal-600 hover:underline">
              Already have an account? Login
            </div>
          </Link>
        </form>
      </div>
    </div>
  );
}