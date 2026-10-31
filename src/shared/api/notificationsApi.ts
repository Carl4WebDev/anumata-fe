import { httpClient } from "./httpClient";

export type NotificationType = "interview_finished" | "results_ready" | "analysis_failed";

export interface AppNotification {
  notification_id: number;
  type: NotificationType;
  title: string;
  message: string | null;
  /** App route to open, e.g. /sessions/12 */
  link: string | null;
  patient_id: number | null;
  interview_link_id: number | null;
  read_at: string | null;
  created_at: string;
}

export interface Inbox {
  items: AppNotification[];
  unread_count: number;
}

export const notificationsApi = {
  inbox() {
    return httpClient.get<Inbox>("/api/notifications").then((r) => r.data);
  },
  markRead(id: number) {
    return httpClient.post<{ read: boolean }>(`/api/notifications/${id}/read`, {}).then((r) => r.data);
  },
  markAllRead() {
    return httpClient.post<{ updated: number }>("/api/notifications/read-all", {}).then((r) => r.data);
  },
};
