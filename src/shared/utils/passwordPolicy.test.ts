import { describe, test, expect } from "vitest";
import { passwordRules, isStrongPassword } from "./passwordPolicy";

const failing = (password: string, ctx?: Parameters<typeof passwordRules>[1]) =>
  passwordRules(password, ctx).filter((r) => !r.ok).map((r) => r.id);

describe("passwordPolicy (mirrors the backend)", () => {
  test("strong password passes every rule", () => {
    expect(isStrongPassword("Kalamansi#Tree8")).toBe(true);
    expect(failing("Kalamansi#Tree8")).toEqual([]);
  });

  test("empty password fails everything", () => {
    expect(failing("")).toEqual(["length", "lower", "upper", "number", "symbol", "pattern", "common", "personal", "spaces"]);
  });

  test("flags missing character classes", () => {
    expect(failing("kalamansitree")).toEqual(expect.arrayContaining(["upper", "number", "symbol"]));
  });

  test("flags common passwords even with additions", () => {
    expect(failing("Password123!")).toContain("common");
    expect(failing("P@ssw0rd")).toContain("common");
  });

  test("flags sequences, repeats and personal info", () => {
    expect(failing("Xy!1234Lmn")).toContain("pattern");
    expect(failing("Xy!9aaaaZ7")).toContain("pattern");
    expect(failing("Santos#Rule8", { email: "maria.santos@clinic.ph", names: ["MARIA", "SANTOS"] })).toContain("personal");
  });
});
