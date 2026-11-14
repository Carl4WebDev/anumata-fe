import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Bell, BellRing, CheckCheck, ClipboardCheck, Radio, Siren, UserCheck } from "lucide-react";
import type { AppNotification, NotificationType } from "../api/notificationsApi";
import { useNotifications, timeAgo } from "../hooks/useNotifications";
import { useToast } from "../context/ToastContext";

const TYPE_STYLE: Record<NotificationType, { icon: typeof Bell; className: string }> = {
  // Opens the live view: one click to watch the interview.
  interview_started: { icon: Radio, className: "bg-red-50 text-red-600" },
  interview_finished: { icon: UserCheck, className: "bg-teal-50 text-teal-600" },
  results_ready: { icon: ClipboardCheck, className: "bg-emerald-50 text-emerald-600" },
  analysis_failed: { icon: AlertTriangle, className: "bg-rose-50 text-rose-600" },
  crisis_flag: { icon: Siren, className: "bg-red-600 text-white" },
};

/** Needs the therapist's attention: shown as an error, and kept on screen. */
const isUrgent = (type: NotificationType) => type === "analysis_failed" || type === "crisis_flag";

function canUseDesktopAlerts(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

/** Bell with unread badge; opens the list of interview notifications. */
export default function NotificationBell() {
  const navigate = useNavigate();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [desktopPermission, setDesktopPermission] = useState<NotificationPermission | "unsupported">(() =>
    canUseDesktopAlerts() ? Notification.permission : "unsupported",
  );
  const panelRef = useRef<HTMLDivElement>(null);

  const { items, unreadCount, markRead, markAllRead } = useNotifications({
    onNew: (n) => {
      if (isUrgent(n.type)) toast.error(n.title);
      else toast.info(n.title);
      // Background tab: also show a system notification, if allowed.
      if (document.hidden && canUseDesktopAlerts() && Notification.permission === "granted") {
        const alert = new Notification(n.title, {
          body: n.message ?? undefined,
          tag: `amumata-${n.notification_id}`,
          // A patient who may be at risk: don't let it fade away unseen.
          requireInteraction: n.type === "crisis_flag",
        });
        alert.onclick = () => {
          window.focus();
          if (n.link) navigate(n.link);
        };
      }
    },
  });

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const openNotification = (n: AppNotification) => {
    if (!n.read_at) void markRead(n.notification_id);
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  const enableDesktopAlerts = async () => {
    if (!canUseDesktopAlerts()) return;
    setDesktopPermission(await Notification.requestPermission());
  };

  const BellIcon = unreadCount > 0 ? BellRing : Bell;

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-teal-700"
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
        aria-expanded={open}
      >
        <BellIcon size={20} />
        {unreadCount > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[11px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 z-50 mt-2 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <p className="font-semibold text-slate-900">Notifications</p>
            {unreadCount > 0 && (
              <button onClick={() => void markAllRead()} className="flex items-center gap-1 text-xs font-medium text-teal-700 hover:underline">
                <CheckCheck size={14} /> Mark all as read
              </button>
            )}
          </div>

          <ul className="max-h-[60vh] overflow-y-auto">
            {items.length === 0 ? (
              <li className="px-4 py-10 text-center text-sm text-slate-400">
                No notifications yet. You'll be told here when a patient finishes an interview.
              </li>
            ) : (
              items.map((n) => {
                const style = TYPE_STYLE[n.type] ?? TYPE_STYLE.interview_finished;
                const Icon = style.icon;
                return (
                  <li key={n.notification_id}>
                    <button
                      onClick={() => openNotification(n)}
                      className={`flex w-full gap-3 border-b border-slate-50 px-4 py-3 text-left transition hover:bg-slate-50 ${n.read_at ? "" : "bg-teal-50/40"}`}
                    >
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${style.className}`}>
                        <Icon size={18} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={`block text-sm ${n.read_at ? "text-slate-700" : "font-semibold text-slate-900"}`}>{n.title}</span>
                        {n.message && <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">{n.message}</span>}
                        <span className="mt-1 block text-[11px] text-slate-400">{timeAgo(n.created_at)}</span>
                      </span>
                      {!n.read_at && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-teal-500" aria-label="Unread" />}
                    </button>
                  </li>
                );
              })
            )}
          </ul>

          {desktopPermission === "default" && (
            <div className="border-t border-slate-100 bg-slate-50 px-4 py-3">
              <button onClick={() => void enableDesktopAlerts()} className="text-xs font-medium text-teal-700 hover:underline">
                Also alert me when Amumata is in a background tab
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
