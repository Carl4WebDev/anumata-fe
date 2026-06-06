import { useState, useCallback, useMemo, useEffect } from "react";
import { DashboardContext } from "./DashboardContext";
import { dashboardApi } from "../../../shared/api/dashboardApi";
import { ApiError } from "../../../shared/api/httpClient";

export const DashboardProvider = ({ children }: { children: React.ReactNode }) => {
  const [dashboard, setDashboard] = useState({
    stats: {
      totalPatients: 0,
      pendingInterviews: 0,
      highRiskCases: 0,
      completedThisWeek: 0,
    },
    recentPatients: [] as { id: number; name: string; risk: string; status: string; lastInterview: string }[],
    riskOverview: { high: 0, moderate: 0, low: 0 },
    emotionTrend: { happy: 0, sad: 0, angry: 0 },
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await dashboardApi.getStats();
      const d = res.data;
      setDashboard({
        stats: {
          totalPatients: d.totalPatients,
          pendingInterviews: d.pendingInterviews,
          highRiskCases: d.highRiskCases,
          completedThisWeek: d.completedThisWeek,
        },
        recentPatients: d.recentPatients,
        riskOverview: d.riskOverview,
        emotionTrend: d.emotionTrend,
      });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to load dashboard";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const clearError = useCallback(() => setError(null), []);

  const value = useMemo(
    () => ({ dashboard, loading, error, clearError }),
    [dashboard, loading, error, clearError],
  );

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
};
