// Simulates a database for interview links.
// Stores link data in localStorage so public interview pages can access it by token.

const STORAGE_KEY = "amumata_interview_links";

export interface InterviewLinkData {
  token: string;
  patientName: string;
  templateName: string;
  questions: string[];
  createdAt: string;
}

export function storeLink(data: InterviewLinkData): void {
  const existing = getAllLinks();
  existing[data.token] = data;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
}

export function getLinkByToken(token: string): InterviewLinkData | null {
  const links = getAllLinks();
  return links[token] ?? null;
}

export function updateLinkStatus(token: string, status: string): void {
  const links = getAllLinks();
  if (links[token]) {
    links[token] = { ...links[token], status } as InterviewLinkData & { status: string };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(links));
  }
}

function getAllLinks(): Record<string, InterviewLinkData> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
