import { useState, useEffect, useCallback } from "react";
import { useUser } from "../../context/users/useUser";
import { useNavigate } from "react-router-dom";
import { Save, LogOut, Lock, User, Brain, Cpu, Eye, Mic, Languages, Zap, FileText, Shield, RefreshCw, Loader2, Camera } from "lucide-react";
import { useToast } from "../../../shared/context/ToastContext";
import { fetchSystemHealth, type SystemHealth } from "../../../shared/api/healthApi";
import Avatar from "../../../shared/components/Avatar";
import AIModelGuide from "../components/AIModelGuide";
import ModelEvaluation from "../components/ModelEvaluation";
import SystemUpdates from "../components/SystemUpdates";
import ChangePasswordModal from "../components/ChangePasswordModal";

/** "starting" = the AI is waking up on Modal (it sleeps when unused). */
type ComponentStatus = "ready" | "not_ready" | "checking" | "starting";

const AI_RECHECK_MS = 15000;

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

const PHOTO_MAX_DIM = 400;

/**
 * Downscale an uploaded photo on a canvas so any camera image fits
 * the 1.5MB base64 limit the API enforces. Transparent areas get a
 * white fill since the output is JPEG.
 */
function resizePhoto(file: File, maxDim: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not process image"));
        return;
      }
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image"));
    };
    img.src = url;
  });
}

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
  if (status === "starting") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
        <Loader2 size={10} className="animate-spin" />
        Starting up
      </span>
    );
  }
  return (
    <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700">
      Not Ready
    </span>
  );
}

const fieldClass =
  "w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500";

function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <label className="mb-1 block text-sm font-medium text-slate-700">
      {children} {hint && <span className="text-slate-400">{hint}</span>}
    </label>
  );
}

export default function SettingsPage() {
  const { profile, updateProfile, setProfileImage, clearUser } = useUser();
  const { success, error } = useToast();
  const navigate = useNavigate();

  // Profile form
  const [fName, setFName] = useState("");
  const [mName, setMName] = useState("");
  const [lName, setLName] = useState("");
  const [phone, setPhone] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [affiliation, setAffiliation] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);

  // Health state
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  // Populate the form once the real profile arrives
  useEffect(() => {
    if (!profile) return;
    setFName(profile.f_name ?? "");
    setMName(profile.m_name ?? "");
    setLName(profile.l_name ?? "");
    setPhone(profile.phone ?? "");
    setSpecialization(profile.specialization ?? "");
    setLicenseNumber(profile.license_number ?? "");
    setAffiliation(profile.affiliation ?? "");
  }, [profile]);

  /** `quiet`: background re-check while the AI wakes up (no "Checking" flash). */
  const loadHealth = useCallback(async ({ quiet = false }: { quiet?: boolean } = {}) => {
    if (!quiet) setHealthLoading(true);
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

  // While the AI wakes up (1–3 min on Modal), keep checking until it's ready.
  const aiStarting = health?.ai_service.status === "starting";
  useEffect(() => {
    if (!aiStarting) return;
    const id = setTimeout(() => void loadHealth({ quiet: true }), AI_RECHECK_MS);
    return () => clearTimeout(id);
  }, [aiStarting, health, loadHealth]);

  const displayName = [fName, mName, lName].filter(Boolean).join(" ") || profile?.email || "Therapist";

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      error("Photo must be a PNG, JPG, or WebP image.");
      return;
    }
    setPhotoBusy(true);
    try {
      const dataUrl = await resizePhoto(file, PHOTO_MAX_DIM);
      const res = await setProfileImage(dataUrl);
      if (res.ok) success("Profile photo updated.");
      else error(res.error ?? "Failed to update photo.");
    } catch {
      error("Could not read that image.");
    } finally {
      setPhotoBusy(false);
    }
  };

  const handleRemovePhoto = async () => {
    setPhotoBusy(true);
    const res = await setProfileImage(null);
    setPhotoBusy(false);
    if (res.ok) success("Profile photo removed.");
    else error(res.error ?? "Failed to remove photo.");
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await updateProfile({
      f_name: fName.trim(),
      m_name: mName.trim(),
      l_name: lName.trim(),
      phone: phone.trim(),
      specialization: specialization.trim(),
      license_number: licenseNumber.trim(),
      affiliation: affiliation.trim(),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      success("Profile saved successfully.");
      setTimeout(() => setSaved(false), 2000);
    } else {
      error(res.error ?? "Failed to save profile.");
    }
  };

  const handleLogout = () => {
    clearUser();
    navigate("/");
  };

  const getComponentStatus = (comp: AiComponent): ComponentStatus => {
    if (healthLoading) return "checking";
    if (!health) return "not_ready";
    if (health.ai_service.status === "starting") return "starting";
    return comp.getStatus(health);
  };

  const overallOk = health?.status === "ok";
  const overallLabel = overallOk ? "All Systems Operational" : aiStarting ? "AI waking up (1–3 min)" : "Partial Outage";

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

            {/* Profile photo */}
            <div className="mb-6 flex items-center gap-5">
              <div className="relative">
                <Avatar name={displayName} src={profile?.profile_image} size="xl" />
                {photoBusy && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                    <Loader2 size={20} className="animate-spin text-white" />
                  </div>
                )}
                <label className="absolute -bottom-1 -right-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:text-teal-600">
                  <Camera size={14} />
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={handlePhotoChange}
                    disabled={photoBusy}
                  />
                </label>
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-900">{displayName}</p>
                <p className="truncate text-xs text-slate-500">{profile?.email ?? ""}</p>
                {profile?.profile_image && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    disabled={photoBusy}
                    className="mt-1 text-xs font-medium text-red-600 transition hover:underline disabled:opacity-50"
                  >
                    Remove photo
                  </button>
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <FieldLabel>First Name</FieldLabel>
                <input
                  type="text"
                  value={fName}
                  onChange={(e) => setFName(e.target.value)}
                  className={fieldClass}
                />
              </div>
              <div>
                <FieldLabel hint="(optional)">Middle Name</FieldLabel>
                <input
                  type="text"
                  value={mName}
                  onChange={(e) => setMName(e.target.value)}
                  className={fieldClass}
                />
              </div>
              <div>
                <FieldLabel>Last Name</FieldLabel>
                <input
                  type="text"
                  value={lName}
                  onChange={(e) => setLName(e.target.value)}
                  className={fieldClass}
                />
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <FieldLabel>Email</FieldLabel>
                <input
                  type="email"
                  value={profile?.email ?? ""}
                  readOnly
                  className={`${fieldClass} cursor-not-allowed bg-slate-50 text-slate-500`}
                />
              </div>
              <div>
                <FieldLabel hint="(optional)">Phone</FieldLabel>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+63 ..."
                  className={fieldClass}
                />
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <FieldLabel hint="(optional)">Specialization</FieldLabel>
                <input
                  type="text"
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                  placeholder="e.g. Cognitive Behavioral Therapy"
                  className={fieldClass}
                />
              </div>
              <div>
                <FieldLabel hint="(optional)">License Number</FieldLabel>
                <input
                  type="text"
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  placeholder="e.g. PRC 123456"
                  className={fieldClass}
                />
              </div>
            </div>

            <div className="mt-4">
              <FieldLabel hint="(optional)">Affiliation</FieldLabel>
              <input
                type="text"
                value={affiliation}
                onChange={(e) => setAffiliation(e.target.value)}
                placeholder="e.g. Clinic, hospital, or practice"
                className={fieldClass}
              />
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-50"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {saved ? "Saved!" : saving ? "Saving..." : "Save Changes"}
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
                    {overallLabel}
                  </span>
                )}
                <button
                  onClick={() => void loadHealth()}
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
              <button
                onClick={() => setShowChangePassword(true)}
                className="flex w-full items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
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

          {/* Therapist Info */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <h2 className="mb-4 text-base font-semibold text-slate-900">Therapist Info</h2>
            <div className="space-y-3 text-sm">
              {[
                { label: "Name", value: displayName },
                { label: "Email", value: profile?.email ?? "—" },
                { label: "Phone", value: profile?.phone || "—" },
                { label: "Specialization", value: profile?.specialization || "—" },
                { label: "License", value: profile?.license_number || "—" },
                { label: "Affiliation", value: profile?.affiliation || "—" },
                {
                  label: "Member Since",
                  value: profile?.created_at
                    ? new Date(profile.created_at).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                    : "—",
                },
              ].map((item) => (
                <div key={item.label} className="flex justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
                  <span className="shrink-0 text-slate-500">{item.label}</span>
                  <span className="truncate text-right font-medium text-slate-700">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* System Info */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <h2 className="mb-4 text-base font-semibold text-slate-900">System Info</h2>
            <div className="space-y-3 text-sm">
              {[
                { label: "System", value: "Amumata v1.0" },
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
              Amumata is an AI-assisted pre-evaluation tool. It does not provide clinical
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

      {/* What changed recently */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <SystemUpdates />
      </section>

      {/* The models' real test-set results */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <ModelEvaluation />
      </section>

      {/* AI Model & Project Guide */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <AIModelGuide />
      </section>

      {showChangePassword && (
        <ChangePasswordModal
          context={{ email: profile?.email, names: [profile?.f_name, profile?.m_name, profile?.l_name] }}
          onClose={() => setShowChangePassword(false)}
          onChanged={() => {
            setShowChangePassword(false);
            success("Password changed. Use your new password next time you log in.");
          }}
        />
      )}
    </div>
  );
}
