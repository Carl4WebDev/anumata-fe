import { Radio, Siren, UserRound } from "lucide-react";
import { liveViewRoute, type AppNotification } from "../api/notificationsApi";

interface CrisisAlertDialogProps {
  alert: AppNotification;
  onWatchLive: () => void;
  onOpenPatient: () => void;
  onClose: () => void;
}

/**
 * Pops up the moment a patient says words that may mean thoughts of self-harm
 * (in English, Tagalog or Bisaya), so the therapist can watch the interview
 * live with one click instead of finding it in the notifications.
 */
export default function CrisisAlertDialog({ alert, onWatchLive, onOpenPatient, onClose }: CrisisAlertDialogProps) {
  const canWatch = liveViewRoute(alert) !== null;
  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 p-4">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="crisis-alert-title"
        aria-describedby="crisis-alert-message"
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-center gap-3 bg-red-600 px-5 py-4 text-white">
          <span className="flex h-10 w-10 shrink-0 animate-pulse items-center justify-center rounded-xl bg-white/20">
            <Siren size={22} />
          </span>
          <h2 id="crisis-alert-title" className="text-lg font-bold">
            {alert.title}
          </h2>
        </div>
        <div className="space-y-3 p-5">
          <p id="crisis-alert-message" className="text-sm leading-relaxed text-slate-700">
            {alert.message}
          </p>
          {canWatch && <p className="text-sm font-medium text-slate-900">Do you want to watch the interview live now?</p>}
          <div className="flex flex-col gap-2 pt-1">
            {canWatch && (
              <button
                onClick={onWatchLive}
                autoFocus
                className="flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
              >
                <Radio size={16} /> Watch live now
              </button>
            )}
            <button
              onClick={onOpenPatient}
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <UserRound size={16} /> Open the patient's page
            </button>
            <button onClick={onClose} className="rounded-xl px-4 py-2 text-sm text-slate-500 hover:bg-slate-50 hover:text-slate-700">
              Later — it stays in your notifications
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
