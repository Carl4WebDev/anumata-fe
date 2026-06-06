import { useState, useCallback, useMemo } from "react";
import { DashboardContext } from "./DashboardContext";

const HARDCODED = {
  stats: {
    totalPatients: 128,
    pendingInterviews: 18,
    highRiskCases: 4,
    completedThisWeek: 32,
  },
  recentPatients: [
    { id: 1, name: "John Doe", risk: "Moderate", status: "Active", lastInterview: "Apr 26, 2026" },
    { id: 2, name: "Jane Smith", risk: "Low", status: "Active", lastInterview: "Apr 24, 2026" },
    { id: 3, name: "Michael Cruz", risk: "High", status: "Review", lastInterview: "Apr 22, 2026" },
    { id: 4, name: "Sarah Reyes", risk: "Low", status: "Active", lastInterview: "Apr 20, 2026" },
  ],
  riskOverview: { high: 20, moderate: 55, low: 80 },
  emotionTrend: {
    happy: 38,
    sad: 47,
    angry: 15,
  },
};

export const DashboardProvider = ({ children }: { children: React.ReactNode }) => {
  const [dashboard] = useState(HARDCODED);
  const [loading] = useState(false);
  const [error] = useState<string | null>(null);

  const clearError = useCallback(() => {}, []);

  const value = useMemo(
    () => ({ dashboard, loading, error, clearError }),
    [dashboard, loading, error, clearError],
  );

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
};
