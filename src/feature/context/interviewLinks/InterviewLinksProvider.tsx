import { useState, useCallback, useMemo } from "react";
import { InterviewLinksContext } from "./InterviewLinksContext";

let nextId = 2;

const INITIAL_LINKS = [
  {
    id: 1,
    patientId: 1,
    patientName: "John Doe",
    templateName: "Family Concerns",
    status: "Pending",
    createdAt: "Apr 26, 2026",
    token: "amumata-abc123",
  },
];

export const InterviewLinksProvider = ({ children }: { children: React.ReactNode }) => {
  const [links, setLinks] = useState(INITIAL_LINKS);
  const [loading] = useState(false);
  const [error] = useState<string | null>(null);

  const clearError = useCallback(() => {}, []);

  const generateLink = useCallback((data: { patientId: number; patientName: string; templateName: string }) => {
    const now = new Date();
    const dateStr = now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const token = "amumata-" + Math.random().toString(36).substring(2, 8);

    const newLink = {
      id: nextId++,
      patientId: data.patientId,
      patientName: data.patientName,
      templateName: data.templateName,
      status: "Pending",
      createdAt: dateStr,
      token,
    };
    setLinks((prev) => [newLink, ...prev]);
    return { ok: true, data: newLink };
  }, []);

  const updateStatus = useCallback((id: number, status: string) => {
    setLinks((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
  }, []);

  const removeLink = useCallback((id: number) => {
    setLinks((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const value = useMemo(
    () => ({ links, loading, error, clearError, generateLink, updateStatus, removeLink }),
    [links, loading, error, clearError, generateLink, updateStatus, removeLink],
  );

  return <InterviewLinksContext.Provider value={value}>{children}</InterviewLinksContext.Provider>;
};
