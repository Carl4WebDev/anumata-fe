import { useState, useCallback, useMemo } from "react";
import { PatientsContext } from "./PatientsContext";

let nextId = 5;

const INITIAL_PATIENTS = [
  { id: 1, name: "John Doe", age: 24, gender: "Male", concern: "Family Concerns", status: "Active", risk: "Moderate", sessions: 6, lastInterview: "Apr 26, 2026" },
  { id: 2, name: "Jane Smith", age: 21, gender: "Female", concern: "Academic Stress", status: "Active", risk: "Low", sessions: 3, lastInterview: "Apr 24, 2026" },
  { id: 3, name: "Michael Cruz", age: 27, gender: "Male", concern: "Self Worth", status: "Review", risk: "High", sessions: 8, lastInterview: "Apr 22, 2026" },
  { id: 4, name: "Sarah Reyes", age: 19, gender: "Female", concern: "Romantic Relationship", status: "Active", risk: "Low", sessions: 2, lastInterview: "Apr 20, 2026" },
];

export const PatientsProvider = ({ children }: { children: React.ReactNode }) => {
  const [patients, setPatients] = useState(INITIAL_PATIENTS);
  const [loading] = useState(false);
  const [error] = useState<string | null>(null);

  const clearError = useCallback(() => {}, []);

  const addPatient = useCallback((data: { name: string; age: number; gender: string; concern: string }) => {
    const now = new Date();
    const dateStr = now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const newPatient = {
      id: nextId++,
      name: data.name,
      age: data.age,
      gender: data.gender,
      concern: data.concern,
      status: "Active",
      risk: "N/A",
      sessions: 0,
      lastInterview: dateStr,
    };
    setPatients((prev) => [newPatient, ...prev]);
    return { ok: true, data: newPatient };
  }, []);

  const removePatient = useCallback((id: number) => {
    setPatients((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const value = useMemo(
    () => ({ patients, loading, error, clearError, addPatient, removePatient }),
    [patients, loading, error, clearError, addPatient, removePatient],
  );

  return <PatientsContext.Provider value={value}>{children}</PatientsContext.Provider>;
};
