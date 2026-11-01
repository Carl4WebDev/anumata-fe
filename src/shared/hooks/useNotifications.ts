import { useCallback, useEffect, useRef, useState } from "react";
import { notificationsApi, type AppNotification } from "../api/notificationsApi";

/** Fired on window when interview notifications arrive, so lists can refresh. */
export const INTERVIEW_UPDATE_EVENT = "amumata:interview-update";

const POLL_MS = 20000;

interface UseNotificationsOptions {
  /** Called once for each notification that arrives after the first load. */
  onNew?: (notification: AppNotification) => void;
}

/**
 * The therapist's notifications, kept fresh by polling (every 20 s, and
 * immediately when the tab regains focus). New arrivals trigger `onNew`.
 */
export function useNotifications({ onNew }: UseNotificationsOptions = {}) {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const seenIdsRef = useRef<Set<number> | null>(null);
  const onNewRef = useRef(onNew);
  useEffect(() => {
    onNewRef.current = onNew;
  });

  const refresh = useCallback(
    () =>
      notificationsApi.inbox().then(
        (inbox) => {
          const seen = seenIdsRef.current;
          const fresh = seen ? inbox.items.filter((n) => !seen.has(n.notification_id) && !n.read_at) : [];
          seenIdsRef.current = new Set([...(seen ?? []), ...inbox.items.map((n) => n.notification_id)]);
          setItems(inbox.items);
          setUnreadCount(inbox.unread_count);
          setLoaded(true);
          // Oldest first, so toasts appear in the order things happened.
          [...fresh].reverse().forEach((n) => onNewRef.current?.(n));
          if (fresh.length > 0) window.dispatchEvent(new CustomEvent(INTERVIEW_UPDATE_EVENT));
        },
        () => {
          /* offline or logged out — try again on the next tick */
        },
      ),
    [],
  );

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, POLL_MS);
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);

  const markRead = useCallback(async (id: number) => {
    setItems((prev) => prev.map((n) => (n.notification_id === id && !n.read_at ? { ...n, read_at: new Date().toISOString() } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
    await notificationsApi.markRead(id).catch(() => {});
  }, []);

  const markAllRead = useCallback(async () => {
    const now = new Date().toISOString();
    setItems((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: now })));
    setUnreadCount(0);
    await notificationsApi.markAllRead().catch(() => {});
  }, []);

  return { items, unreadCount, loaded, refresh, markRead, markAllRead };
}

/** "just now", "5 min ago", "3 h ago", "Oct 30". */
export function timeAgo(iso: string, now: Date = new Date()): string {
  const seconds = Math.max(0, (now.getTime() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} h ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
