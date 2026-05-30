import { describe, expect, it } from "vitest";
import { formatPhoneSN, isValidPhoneSN, normalizePhoneSN } from "./formatPhone";

describe("formatPhone (Sénégal)", () => {
  it("valide un numéro +221 correct", () => {
    expect(isValidPhoneSN("+221771234567")).toBe(true);
    expect(isValidPhoneSN("+22177123456")).toBe(false); // 8 chiffres
    expect(isValidPhoneSN("771234567")).toBe(false);
  });

  it("normalise différentes saisies vers +221XXXXXXXXX", () => {
    expect(normalizePhoneSN("77 123 45 67")).toBe("+221771234567");
    expect(normalizePhoneSN("0771234567")).toBe("+221771234567");
    expect(normalizePhoneSN("+221771234567")).toBe("+221771234567");
    expect(normalizePhoneSN("221771234567")).toBe("+221771234567");
  });

  it("formate pour l'affichage", () => {
    expect(formatPhoneSN("+221771234567")).toBe("+221 77 123 45 67");
    expect(formatPhoneSN(null)).toBe("");
  });
});
