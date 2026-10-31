import { createContext } from "react";
import type { MappedSession } from "../../../shared/types/session";

export type SessionReport = MappedSession["report"];

export interface SessionsValue {
  sessions: MappedSession[];
  loading: boolean;
  error: string | null;
  getSessionById: (id: number) => MappedSession | null;
  fetchSessionById: (id: number) => Promise<MappedSession | null>;
  updateNotes: (sessionId: number, notes: string) => Promise<void>;
  regenerateReport: (sessionId: number) => Promise<SessionReport>;
}

export const SessionsContext = createContext<SessionsValue | null>(null);
