import { useContext } from "react";
import { DashboardContext } from "./DashboardContext";

export const useDashboard = () => {
  const ctx = useContext(DashboardContext);
  if (!ctx) {
    throw new Error("useDashboard must be used inside DashboardProvider");
  }
  return ctx;
};
