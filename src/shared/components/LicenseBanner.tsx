import { useState } from "react";
import { Link } from "react-router-dom";
import { BadgeAlert, X } from "lucide-react";
import { useUser } from "../../feature/context/users/useUser";

const DISMISS_KEY = "license_banner_dismissed_on";

function today(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
}

function dismissedToday(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === today();
  } catch {
    return false;
  }
}

/**
 * Reminder for therapists whose PRC license isn't verified yet. They can keep using
 * Amumata; hiding it lasts until tomorrow (a daily notification is sent too).
 */
export default function LicenseBanner() {
  const { profile } = useUser();
  const [hidden, setHidden] = useState(dismissedToday);

  if (!profile || hidden || profile.role === "ADMIN" || !profile.license_status || profile.license_status === "verified") {
    return null;
  }

  const missing = !profile.profession || !profile.license_number || !profile.license_name;
  const notMatched = profile.license_status === "not_matched";
  const message = missing
    ? "Add your profession, PRC license number and the name on your PRC ID so your license can be verified."
    : notMatched
      ? `Your PRC license details didn't match${profile.license_note ? `: ${profile.license_note}` : "."} Please check them.`
      : "Your PRC license is waiting to be verified. You can keep using Amumata meanwhile.";

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, today());
    } catch {
      // Hiding just won't last after a reload.
    }
    setHidden(true);
  };

  return (
    <div
      role="status"
      className={`mb-4 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
        notMatched ? "border-red-200 bg-red-50 text-red-800" : "border-amber-200 bg-amber-50 text-amber-900"
      }`}
    >
      <BadgeAlert size={18} className="mt-0.5 shrink-0" />
      <p className="flex-1">
        {message}{" "}
        <Link to="/settings#license" className="font-semibold underline underline-offset-2">
          {missing || notMatched ? "Update license details" : "View license details"}
        </Link>
      </p>
      <button onClick={dismiss} className="rounded p-0.5 opacity-60 hover:opacity-100" aria-label="Hide until tomorrow" title="Hide until tomorrow">
        <X size={16} />
      </button>
    </div>
  );
}
