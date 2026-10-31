import { createContext } from "react";

export interface DashboardState {
  stats: {
    totalPatients: number;
    pendingInterviews: number;
    highRiskCases: number;
    completedThisWeek: number;
  };
  recentPatients: { id: number; name: string; risk: string; status: string; lastInterview: string }[];
  riskOverview: { high: number; moderate: number; low: number };
  emotionTrend: { happy: number; sad: number; angry: number };
}

export interface DashboardValue {
  dashboard: DashboardState;
  loading: boolean;
  error: string | null;
  clearError: () => void;
}

export const DashboardContext = createContext<DashboardValue | null>(null);
