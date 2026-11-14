/** Where to go after signing in: admins have their own page. */
export function homePathFor(role: string | undefined): string {
  return role === "ADMIN" ? "/admin" : "/dashboard";
}

/** Role of the signed-in user, from what was saved at login (before the profile loads). */
export function storedRole(): string | undefined {
  try {
    const raw = localStorage.getItem("user");
    return raw ? (JSON.parse(raw) as { role?: string }).role : undefined;
  } catch {
    return undefined;
  }
}
