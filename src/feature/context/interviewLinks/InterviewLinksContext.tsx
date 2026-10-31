import { createContext } from "react";

export interface GenerateLinkData {
  patientId: number;
  patientName: string;
  questionSetId: number;
  templateName: string;
}

export interface InterviewLinksValue {
  links: any[];
  loading: boolean;
  error: string | null;
  clearError: () => void;
  generateLink: (data: GenerateLinkData) => Promise<{ ok: boolean; data?: unknown }>;
  updateStatus: (id: number, status: string) => Promise<void>;
  /** Resolves false if the server refused (the link is put back). */
  removeLink: (id: number) => Promise<boolean>;
}

export const InterviewLinksContext = createContext<InterviewLinksValue | null>(null);
