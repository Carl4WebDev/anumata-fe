/**
 * Which interview files already reached the server through early upload
 * (emotionApi.stageFiles). Kept in sessionStorage so the processing page
 * only uploads what is left.
 */

const key = (token: string) => `amumata_staged_${token}`;

export function getStagedNames(token: string): string[] {
  try {
    const names: unknown = JSON.parse(sessionStorage.getItem(key(token)) ?? "[]");
    return Array.isArray(names) ? names.filter((n): n is string => typeof n === "string") : [];
  } catch {
    return [];
  }
}

export function addStagedNames(token: string, names: string[]): void {
  try {
    const all = new Set([...getStagedNames(token), ...names]);
    sessionStorage.setItem(key(token), JSON.stringify([...all]));
  } catch {
    /* storage full or blocked — the files are simply uploaded at the end */
  }
}

export function clearStagedNames(token: string): void {
  try {
    sessionStorage.removeItem(key(token));
  } catch {
    /* ignore */
  }
}

/** Split the interview files into "already on the server" and "still to send". */
export function splitStaged<T extends { name: string }>(token: string, files: T[]): { staged: string[]; toUpload: T[] } {
  const stagedSet = new Set(getStagedNames(token));
  const staged = files.filter((f) => stagedSet.has(f.name)).map((f) => f.name);
  const sent = new Set(staged);
  return { staged, toUpload: files.filter((f) => !sent.has(f.name)) };
}
