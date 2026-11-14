import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { BadgeCheck, BadgeAlert, Clock, Loader2, Save } from "lucide-react";
import { useUser } from "../../context/users/useUser";
import { useToast } from "../../../shared/context/ToastContext";
import { PROFESSIONS } from "../../../shared/constants/professions";

const fieldClass =
  "w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-teal-500 focus:ring-1 focus:ring-teal-500";

const STATUS = {
  verified: { label: "PRC verified", icon: BadgeCheck, className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  pending: { label: "Waiting for verification", icon: Clock, className: "bg-amber-50 text-amber-800 border-amber-200" },
  not_matched: { label: "Didn't match PRC records", icon: BadgeAlert, className: "bg-red-50 text-red-700 border-red-200" },
} as const;

/** The therapist's PRC license, its verification status, and editing it (which sends it for checking again). */
export default function LicenseCard() {
  const { profile } = useUser();
  const { hash } = useLocation();

  // Opened from the reminder banner (/settings#license): bring this card into view.
  useEffect(() => {
    if (hash === "#license") document.getElementById("license")?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  }, [hash]);

  // The form starts from the saved details, and starts over when they change (loaded or saved).
  const saved = [profile?.profession, profile?.license_number, profile?.license_name].join("|");
  return <LicenseForm key={saved} />;
}

function LicenseForm() {
  const { profile, updateProfile } = useUser();
  const { success, error } = useToast();
  const [profession, setProfession] = useState(profile?.profession ?? "");
  const [licenseNumber, setLicenseNumber] = useState(profile?.license_number ?? "");
  const [licenseName, setLicenseName] = useState(profile?.license_name ?? "");
  const [saving, setSaving] = useState(false);

  const status = STATUS[profile?.license_status ?? "pending"];
  const StatusIcon = status.icon;
  const changed =
    profession !== (profile?.profession ?? "") ||
    licenseNumber.trim() !== (profile?.license_number ?? "") ||
    licenseName.trim().toUpperCase() !== (profile?.license_name ?? "");

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profession || !licenseNumber.trim() || !licenseName.trim()) {
      error("Fill in your profession, PRC license number and the name on your PRC ID.");
      return;
    }
    setSaving(true);
    const res = await updateProfile({ profession, license_number: licenseNumber.trim(), license_name: licenseName.trim() });
    setSaving(false);
    if (res.ok) success("License details saved. They'll be checked on the PRC verification service.");
    else error(res.error ?? "Failed to save license details.");
  };

  return (
    <form id="license" onSubmit={save} className="scroll-mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-slate-900">PRC License</h2>
          <p className="text-xs text-slate-500">Checked against the PRC verification service by the Amumata administrator.</p>
        </div>
        <span className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${status.className}`}>
          <StatusIcon size={14} />
          {status.label}
        </span>
      </div>

      {profile?.license_status === "not_matched" && profile.license_note && (
        <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{profile.license_note}</p>
      )}
      {profile?.license_status === "verified" && profile.license_checked_at && (
        <p className="mb-4 text-xs text-slate-500">
          Verified on {new Date(profile.license_checked_at).toLocaleDateString("en-PH", { dateStyle: "long" })}.
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Profession</span>
          <select value={profession} onChange={(e) => setProfession(e.target.value)} className={fieldClass} aria-label="Profession">
            <option value="">Choose…</option>
            {PROFESSIONS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">PRC license number</span>
          <input
            value={licenseNumber}
            onChange={(e) => setLicenseNumber(e.target.value)}
            inputMode="numeric"
            maxLength={14}
            placeholder="e.g. 0012345"
            className={fieldClass}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Name on your PRC ID</span>
          <input
            value={licenseName}
            onChange={(e) => setLicenseName(e.target.value)}
            maxLength={150}
            placeholder="e.g. MARIA S. REYES"
            className={fieldClass}
          />
        </label>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          {profile?.license_status === "verified" ? "Changing these details sends your license for checking again." : ""}
        </p>
        <button
          type="submit"
          disabled={saving || !changed}
          className="flex items-center gap-2 rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-50"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {saving ? "Saving..." : "Save license details"}
        </button>
      </div>
    </form>
  );
}
