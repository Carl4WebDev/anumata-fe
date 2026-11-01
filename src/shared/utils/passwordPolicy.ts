/**
 * Password strength rules, mirrored from the backend
 * (anumata-be/src/modules/users/application/passwordPolicy.js) so the checklist
 * shows exactly what the server enforces — keep both in sync.
 */

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72;

const COMMON_PASSWORDS = new Set([
  "password", "passw0rd", "p@ssword", "p@ssw0rd", "password1", "letmein", "welcome", "admin",
  "administrator", "qwerty", "qwertyuiop", "asdfgh", "asdfghjkl", "zxcvbnm", "iloveyou", "monkey",
  "dragon", "sunshine", "princess", "football", "baseball", "basketball", "master", "superman",
  "batman", "trustno1", "abc123", "changeme", "secret", "default", "login", "starwars", "whatever",
  "freedom", "shadow", "michael", "jennifer", "computer", "internet", "hello", "test", "guest",
  "user", "root", "therapist", "therapy", "doctor", "clinic", "hospital", "anumata", "amumata",
  "philippines", "pilipinas", "manila", "mahalkita", "iloveu", "summer", "winter", "spring", "autumn",
]);

const SEQUENCES = ["0123456789", "abcdefghijklmnopqrstuvwxyz", "qwertyuiop", "asdfghjkl", "zxcvbnm"];
const SEQUENCE_RUN = 4;

function hasSequence(lower: string): boolean {
  for (const seq of SEQUENCES) {
    for (const s of [seq, [...seq].reverse().join("")]) {
      for (let i = 0; i + SEQUENCE_RUN <= s.length; i++) {
        if (lower.includes(s.slice(i, i + SEQUENCE_RUN))) return true;
      }
    }
  }
  return false;
}

function isCommon(lower: string): boolean {
  const base = lower.replace(/[\d\W_]+$/u, "").replace(/^[\d\W_]+/u, "");
  return COMMON_PASSWORDS.has(lower) || (base.length > 0 && COMMON_PASSWORDS.has(base));
}

export interface PasswordContext {
  email?: string | null;
  names?: (string | null | undefined)[];
}

export interface PasswordRule {
  id: string;
  label: string;
  ok: boolean;
}

/** Checklist of every rule and whether `password` meets it. */
export function passwordRules(password: string, { email, names = [] }: PasswordContext = {}): PasswordRule[] {
  const lower = password.toLowerCase();
  const personal = [email?.split("@")[0], ...names]
    .filter((part): part is string => typeof part === "string")
    .flatMap((part) => part.toLowerCase().split(/[\s._-]+/))
    .filter((part) => part.length >= 3);
  const empty = password.length === 0;

  return [
    { id: "length", label: `${PASSWORD_MIN_LENGTH}–${PASSWORD_MAX_LENGTH} characters`, ok: password.length >= PASSWORD_MIN_LENGTH && password.length <= PASSWORD_MAX_LENGTH },
    { id: "lower", label: "A lowercase letter", ok: /[a-z]/.test(password) },
    { id: "upper", label: "An uppercase letter", ok: /[A-Z]/.test(password) },
    { id: "number", label: "A number", ok: /\d/.test(password) },
    { id: "symbol", label: "A symbol (e.g. ! @ # $)", ok: /[^A-Za-z0-9]/.test(password) },
    { id: "pattern", label: "No runs like 1234, abcd or aaaa", ok: !empty && !hasSequence(lower) && !/(.)\1{3,}/.test(password) },
    { id: "common", label: "Not a common password", ok: !empty && !isCommon(lower) },
    { id: "personal", label: "Doesn't contain your name or email", ok: !empty && !personal.some((part) => lower.includes(part)) },
    { id: "spaces", label: "No space at the start or end", ok: !empty && !/^\s|\s$/.test(password) },
  ];
}

export function isStrongPassword(password: string, context?: PasswordContext): boolean {
  return passwordRules(password, context).every((rule) => rule.ok);
}
