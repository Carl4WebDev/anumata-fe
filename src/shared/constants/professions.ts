/** PRC-licensed professions that may use Amumata (same keys as the backend). */
export const PROFESSIONS = [
  { value: "psychologist", label: "Psychologist" },
  { value: "psychometrician", label: "Psychometrician" },
  { value: "guidance_counselor", label: "Guidance Counselor" },
  { value: "psychiatrist", label: "Psychiatrist (Physician)" },
  { value: "social_worker", label: "Social Worker" },
] as const;

export type Profession = (typeof PROFESSIONS)[number]["value"];

export type LicenseStatus = "pending" | "verified" | "not_matched";

export function professionLabel(value: string | null | undefined): string {
  return PROFESSIONS.find((p) => p.value === value)?.label ?? "—";
}

/** The PRC page where licenses are checked (by profession and name). */
export const PRC_VERIFICATION_URL = "https://verification.prc.gov.ph/";
