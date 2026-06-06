import { useContext } from "react";
import { PatientsContext } from "./PatientsContext";

export const usePatients = () => {
  const ctx = useContext(PatientsContext);
  if (!ctx) {
    throw new Error("usePatients must be used inside PatientsProvider");
  }
  return ctx;
};
