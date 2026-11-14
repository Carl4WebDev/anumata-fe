import { httpClient } from "./httpClient";
import type { LicenseStatus } from "../constants/professions";

/** A therapist account as the admin sees it: account and license details, counts only. */
export interface AdminTherapist {
  user_id: number;
  email: string;
  f_name: string;
  m_name: string | null;
  l_name: string;
  profession: string | null;
  license_number: string | null;
  license_name: string | null;
  license_status: LicenseStatus;
  license_note: string | null;
  license_checked_at: string | null;
  license_checked_by_email: string | null;
  is_active: boolean;
  deactivated_at: string | null;
  created_at: string;
  patient_count: number;
  interview_link_count: number;
}

export interface AdminAction {
  action_id: number;
  action: "license_verified" | "license_not_matched" | "deactivated" | "reactivated";
  note: string | null;
  created_at: string;
  admin_email: string | null;
}

export interface AdminSummary {
  therapists: number;
  pending: number;
  verified: number;
  not_matched: number;
  deactivated: number;
}

export type AdminFilter = "" | LicenseStatus | "deactivated";

/** How the system is used — aggregate counts and times only, no patient data. */
export interface AdminUsage {
  counts: {
    therapists: number;
    therapists_verified: number;
    therapists_new_30d: number;
    links_sent_7d: number;
    links_sent_30d: number;
    interviews_completed_7d: number;
    interviews_completed_30d: number;
    links_unused: number;
    analyses_ready_7d: number;
    analyses_ready_30d: number;
    analyses_failed_7d: number;
    analyses_failed_30d: number;
    /** Average seconds from "interview finished" to "results ready"; null when none yet. */
    avg_seconds_to_results_30d: number | null;
    appointments_7d: number;
    appointments_30d: number;
    follow_ups_30d: number;
  };
  /** Analysed interviews per week, oldest first (8 weeks). */
  weekly: { week_start: string; interviews: number }[];
  /** Analysis failures in the last 30 days: when, and whose interview (therapist email only). */
  failures: { notification_id: number; created_at: string; therapist_email: string }[];
}

export const adminApi = {
  usage() {
    return httpClient.get<AdminUsage>("/api/admin/usage");
  },

  listTherapists(params: { status?: AdminFilter; search?: string } = {}) {
    const q = new URLSearchParams();
    if (params.status) q.set("status", params.status);
    if (params.search?.trim()) q.set("search", params.search.trim());
    const qs = q.toString();
    return httpClient.get<{ summary: AdminSummary; therapists: AdminTherapist[] }>(`/api/admin/therapists${qs ? `?${qs}` : ""}`);
  },

  getTherapist(id: number) {
    return httpClient.get<AdminTherapist & { actions: AdminAction[] }>(`/api/admin/therapists/${id}`);
  },

  setLicense(id: number, status: "verified" | "not_matched", note?: string) {
    return httpClient.patch<AdminTherapist & { actions: AdminAction[] }>(`/api/admin/therapists/${id}/license`, { status, note });
  },

  setActive(id: number, active: boolean, note?: string) {
    return httpClient.patch<AdminTherapist & { actions: AdminAction[] }>(`/api/admin/therapists/${id}/active`, { active, note });
  },
};
