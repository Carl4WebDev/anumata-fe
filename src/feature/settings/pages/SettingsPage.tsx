import { useState, useEffect, useCallback } from "react";
import { useUser } from "../../context/users/useUser";
import { useNavigate } from "react-router-dom";
import { Save, LogOut, Lock, User, Brain, Cpu, Eye, Mic, Languages, Zap, FileText, Shield, RefreshCw, Loader2 } from "lucide-react";
import { useToast } from "../../../shared/context/ToastContext";
import { fetchSystemHealth, type SystemHealth } from "../../../shared/api/healthApi";

type ComponentStatus = "ready" | "not_ready" | "checking";

interface AiComponent {
  icon: typeof Eye;
  name: string;
  model: string;
  output: string;
  getStatus: (health: SystemHealth) => ComponentStatus;
}

const aiComponents: AiComponent[] = [
  {
    icon: Eye,
    name: "Facial Emotion Recognition",
    model: "EfficientNet-B0",
    output: "Angry, Happy, Neutral, Sad",
    getStatus: (h) => (h.ai_service.models.fer ? "ready" : "not_ready"),
  },
  {
    icon: Mic,
    name: "Speech Emotion Recognition",
    model: "Wav2Vec2",
    output: "Angry, Happy, Neutral, Sad",
    getStatus: (h) => (h.ai_service.models.ser ? "ready" : "not_ready"),
  },
  {
    icon: Languages,
    name: "Language Emotion Recognition",
    model: "XLM-RoBERTa",
    output: "Angry, Happy, Neutral, Sad",
    getStatus: (h) => (h.ai_service.models.ler ? "ready" : "not_ready"),
  },
  {
    icon: Zap,
    name: "Fusion Engine",
    model: "Confidence-Adaptive Weighted Fusion",
    output: "FER 50% · SER 50% · LER 0% (Experimental)",
    getStatus: (h) => (h.ai_service.status === "ok" ? "ready" : "not_ready"),
  },
  {
    icon: FileText,
    name: "AI Session Summary",
    model: "Llama 3.2:3B via Ollama",
    output: "Session narrative, topics, follow-up suggestions",
    getStatus: (h) => (h.ollama.status === "ok" ? "ready" : "not_ready"),
  },
  {
    icon: Cpu,
    name: "Speech-to-Text",
    model: "Faster-Whisper (large-v3)",
    output: "Auto-detect Filipino, Bisaya, English",
    getStatus: (h) => (h.ai_service.models.stt ? "ready" : "not_ready"),
  },
];

function StatusBadge({ status }: { status: ComponentStatus }) {
  if (status === "checking") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
        <Loader2 size={10} className="animate-spin" />
        Checking
      </span>
    );
  }
  if (status === "ready") {
    return (
      <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700">
        Ready
      </span>
    );
  }
  return (
    <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700">
      Not Ready
    </span>
  );
}

export default function SettingsPage() {
  const { clearUser } = useUser();
  const { success } = useToast();
  const navigate = useNavigate();

  // Profile form
  const [fName, setFName] = useState("");
  const [mName, setMName] = useState("");
  const [lName, setLName] = useState("");
  const [email, setEmail] = useState("doctor@email.com");
  const [saved, setSaved] = useState(false);

  // Health state
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const loadHealth = useCallback(async () => {
    setHealthLoading(true);
    try {
      const data = await fetchSystemHealth();
      setHealth(data);
      setLastChecked(new Date());
    } catch {
      setHealth(null);
    } finally {
      setHealthLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHealth();
  }, [loadHealth]);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    success("Settings saved successfully.");
    setTimeout(() => setSaved(false), 2000);
  };

  const handleLogout = () => {
    clearUser();
    navigate("/");
  };

  const getComponentStatus = (comp: AiComponent): ComponentStatus => {
    if (healthLoading) return "checking";
    if (!health) return "not_ready";
    return comp.getStatus(health);
  };

  const overallOk = health?.status === "ok";

  return (
    <div className="space-y-6 md:space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">Manage therapist account and system information.</p>
      </div>

      <section className="grid gap-6 xl:grid-cols-3">
        {/* Left column */}
        <div className="space-y-6 xl:col-span-2">
          {/* Therapist Profile */}
          <form onSubmit={handleSaveProfile} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50">
                <User size={18} className="text-teal-600" />
              </div>
              <h2 className="text-base font-semibold text-slate-900">Therapist Profile</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">First Name</label>
                <input
                  type="text"
                  value={fName}
                  onChange={(e) => setFName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Middle Name <span className="text-slate-400">(optional)</span></label>
                <input
                  type="text"
                  value={mName}
                  onChange={(e) => setMName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Last Name</label>
                <input
                  type="text"
                  value={lName}
                  onChange={(e) => setLName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
              />
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="submit"
                className="flex items-center gap-2 rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700"
              >
                <Save size={16} />
                {saved ? "Saved!" : "Save Changes"}
              </button>
            </div>
          </form>

          {/* AI Components */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50">
                <Brain size={18} className="text-teal-600" />
              </div>
              <div className="flex-1">
                <h2 className="text-base font-semibold text-slate-900">AI Components</h2>
                <p className="text-xs text-slate-400">System-managed pipeline. Not user-configurable.</p>
              </div>
              <div className="flex items-center gap-2">
                {!healthLoading && health && (
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${overallOk ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>
                    {overallOk ? "All Systems Operational" : "Partial Outage"}
                  </span>
                )}
                <button
                  onClick={loadHealth}
                  disabled={healthLoading}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  <RefreshCw size={12} className={healthLoading ? "animate-spin" : ""} />
                  Refresh
                </button>
              </div>
            </div>

            {/* Last checked */}
            {lastChecked && (
              <p className="mb-3 text-[11px] text-slate-400">
                Last checked: {lastChecked.toLocaleTimeString()}
              </p>
            )}

            <div className="space-y-3">
              {aiComponents.map((comp) => {
                const Icon = comp.icon;
                const status = getComponentStatus(comp);
                return (
                  <div
                    key={comp.name}
                    className="flex items-start gap-4 rounded-xl border border-slate-200 px-4 py-3"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                      <Icon size={16} className="text-slate-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-800">{comp.name}</span>
                        <StatusBadge status={status} />
                      </div>
                      <p className="text-xs text-slate-500">{comp.model}</p>
                      <p className="text-[11px] text-slate-400">{comp.output}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="mt-4 text-[11px] text-slate-400 italic">
              Base weights are configurable by the system administrator. Actual influence is confidence-adaptive.
            </p>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Account Actions */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50">
                <Lock size={18} className="text-teal-600" />
              </div>
              <h2 className="text-base font-semibold text-slate-900">Security</h2>
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
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <h2 className="mb-4 text-base font-semibold text-slate-900">System Info</h2>
            <div className="space-y-3 text-sm">
              {[
                { label: "System", value: "Anumata v1.0" },
                { label: "FER", value: "EfficientNet-B0 (4-class)" },
                { label: "SER", value: "Wav2Vec2 (4-class)" },
                { label: "LER", value: "XLM-RoBERTa (4-class)" },
                { label: "STT", value: "Faster-Whisper large-v3" },
                { label: "Summary", value: "Llama 3.2:3B via Ollama" },
                { label: "Fusion", value: "Confidence-Adaptive Weighted" },
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
          <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 md:p-5">
            <h3 className="mb-2 text-sm font-semibold text-orange-800">Disclaimer</h3>
            <p className="text-xs leading-relaxed text-orange-700">
              Anumata is an AI-assisted pre-evaluation tool. It does not provide clinical
              diagnoses. All outputs require interpretation by a licensed mental health
              professional.
            </p>
          </div>

          {/* Privacy */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Shield size={16} className="text-slate-500" />
              <h3 className="text-sm font-semibold text-slate-700">Privacy</h3>
            </div>
            <p className="text-xs leading-relaxed text-slate-500">
              All interview data is processed locally. No personal data is sent to external servers.
              Recordings and analysis results are stored securely and accessible only to the assigned therapist.
              Compliant with RA 10173 (Data Privacy Act of 2012).
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
