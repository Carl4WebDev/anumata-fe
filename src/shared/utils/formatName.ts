/**
 * Format name parts into a display string.
 * Omits empty/null middle name cleanly.
 */
export function formatName(fName: string, mName?: string | null, lName?: string): string {
  const parts = [fName, mName, lName].filter(Boolean);
  return parts.join(" ");
}