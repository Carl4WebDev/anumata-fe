import { useContext } from "react";
import { SessionsContext } from "./SessionsContext";

export const useSessions = () => {
  const ctx = useContext(SessionsContext);
  if (!ctx) {
    throw new Error("useSessions must be used inside SessionsProvider");
  }
  return ctx;
};
