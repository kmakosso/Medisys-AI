import { describe, expect, it } from "vitest";
import { scorePassword } from "./PasswordStrengthBar";

describe("scorePassword", () => {
  it("note faiblement les mots de passe courts", () => {
    expect(scorePassword("abc")).toBeLessThanOrEqual(1);
  });

  it("note fortement un mot de passe long et varié", () => {
    expect(scorePassword("MotDePasse2026!")).toBe(4);
  });

  it("plafonne à 4", () => {
    expect(scorePassword("Aa1!aaaaaaaaaaaaaaaa")).toBeLessThanOrEqual(4);
  });
});
