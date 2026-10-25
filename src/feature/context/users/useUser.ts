import { useContext } from "react";
import { UserContext, type UserContextValue } from "./UserContext";

export const useUser = (): UserContextValue => {
  const ctx = useContext(UserContext);

  if (!ctx) {
    throw new Error("useUser must be used inside UserProvider");
  }

  return ctx;
};
