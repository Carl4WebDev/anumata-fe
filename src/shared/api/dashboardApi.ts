import { httpClient } from "./httpClient";

export interface DashboardStats {
  totalPatients: number;
  pendingInterviews: number;
  highRiskCases: number;
  completedThisWeek: number;
  recentPatients: { id: number; name: string; risk: string; status: string; lastInterview: string }[];
  riskOverview: { high: number; moderate: number; low: number };
  emotionTrend: { happy: number; sad: number; angry: number };
}

export const dashboardApi = {
  getStats() {
    return httpClient.get<DashboardStats>("/api/dashboard/stats");
  },
};
