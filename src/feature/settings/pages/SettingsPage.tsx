import { useState } from "react";
import { useUser } from "../../context/users/useUser";
import { useNavigate } from "react-router-dom";
import { Save, LogOut, Lock, User, Bell, Shield } from "lucide-react";

export default function SettingsPage() {
  const { clearUser } = useUser();
  const navigate = useNavigate();

  // Profile form
  const [name, setName] = useState("Dr. Maria Reyes");
  const [email, setEmail] = useState("doctor@email.com");
  const [saved, setSaved] = useState(false);

  // Interview settings toggles
  const [enableFER, setEnableFER] = useState(true);
  const [enableSER, setEnableSER] = useState(true);
  const [autoSummary, setAutoSummary] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleLogout = () => {
    clearUser();
    navigate("/");
  };

  return (
    <div className="space-y-6 md:space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 md:text-4xl">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">Manage therapist account and system preferences.</p>
      </div>

      <section className="grid gap-6 xl:grid-cols-3">
        {/* Left column */}
        <div className="space-y-6 xl:col-span-2">
          {/* Therapist Profile */}
          <form onSubmit={handleSaveProfile} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50">
                <User size={18} className="text-blue-600" />
              </div>
              <h2 className="text-lg font-semibold md:text-xl">Therapist Profile</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="submit"
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                <Save size={16} />
                {saved ? "Saved!" : "Save Changes"}
              </button>
            </div>
          </form>

          {/* Interview Settings */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50">
                <Shield size={18} className="text-blue-600" />
              </div>
              <h2 className="text-lg font-semibold md:text-xl">Interview Settings</h2>
            </div>
            <div className="space-y-4">
              {[
                { label: "Enable Facial Expression Recognition (FER)", desc: "Analyze client facial expressions during interviews.", checked: enableFER, onChange: setEnableFER },
                { label: "Enable Speech Emotion Recognition (SER)", desc: "Analyze client speech tone and vocal patterns.", checked: enableSER, onChange: setEnableSER },
                { label: "Auto-Generate Therapist Summary", desc: "Automatically create a summary after each interview.", checked: autoSummary, onChange: setAutoSummary },
              ].map((item) => (
                <label key={item.label} className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-slate-200 px-4 py-3">
                  <div>
                    <span className="block text-sm font-medium text-slate-700">{item.label}</span>
                    <span className="text-xs text-slate-400">{item.desc}</span>
                  </div>
                  <div className="relative shrink-0 mt-0.5">
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={(e) => item.onChange(e.target.checked)}
                      className="peer sr-only"
                    />
                    <div className="h-6 w-11 rounded-full bg-slate-200 transition peer-checked:bg-blue-600" />
                    <div className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Notification Settings */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50">
                <Bell size={18} className="text-blue-600" />
              </div>
              <h2 className="text-lg font-semibold md:text-xl">Notifications</h2>
            </div>
            <label className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-slate-200 px-4 py-3">
              <div>
                <span className="block text-sm font-medium text-slate-700">Email Notifications</span>
                <span className="text-xs text-slate-400">Receive email alerts when a client completes an interview.</span>
              </div>
              <div className="relative shrink-0 mt-0.5">
                <input
                  type="checkbox"
                  checked={emailNotifications}
                  onChange={(e) => setEmailNotifications(e.target.checked)}
                  className="peer sr-only"
                />
                <div className="h-6 w-11 rounded-full bg-slate-200 transition peer-checked:bg-blue-600" />
                <div className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
              </div>
            </label>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Account Actions */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-50">
                <Lock size={18} className="text-blue-600" />
              </div>
              <h2 className="text-lg font-semibold md:text-xl">Security</h2>
            </div>
            <div className="space-y-3">
              <button className="flex w-full items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
                <Lock size={16} className="text-slate-400" />
                Change Password
              </button>
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600 transition hover:bg-red-100"
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          </div>

          {/* System Info */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
            <h2 className="mb-4 text-lg font-semibold md:text-xl">System Info</h2>
            <div className="space-y-3 text-sm">
              {[
                { label: "System", value: "Amumata v1.0" },
                { label: "FER Model", value: "4-class (Angry, Happy, Neutral, Sad)" },
                { label: "SER Model", value: "3-class + Neutral threshold" },
                { label: "Framework", value: "Transfer Learning" },
                { label: "Privacy", value: "RA 10173 Compliant" },
              ].map((item) => (
                <div key={item.label} className="flex justify-between rounded-lg bg-slate-50 px-3 py-2">
                  <span className="text-slate-500">{item.label}</span>
                  <span className="font-medium text-slate-700">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Disclaimer */}
          <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 md:p-5">
            <h3 className="mb-2 text-sm font-semibold text-orange-800">Disclaimer</h3>
            <p className="text-xs leading-relaxed text-orange-700">
              Amumata is an AI-assisted pre-evaluation tool. It does not provide clinical
              diagnoses. All outputs require interpretation by a licensed mental health
              professional.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
