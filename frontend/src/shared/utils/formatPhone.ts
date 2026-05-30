/** Indicatif Sénégal. */
export const INDICATIF_SN = "+221";

/** Valide un numéro sénégalais au format +221XXXXXXXXX (9 chiffres après l'indicatif). */
export function isValidPhoneSN(value: string): boolean {
  return /^\+221[0-9]{9}$/.test(value);
}

/** Normalise une saisie locale vers le format +221XXXXXXXXX.
 *  Accepte "77 123 45 67", "0771234567", "+221771234567"… */
export function normalizePhoneSN(input: string): string {
  let digits = input.replace(/[^\d]/g, "");
  if (digits.startsWith("221")) digits = digits.slice(3);
  if (digits.startsWith("0")) digits = digits.slice(1);
  return `${INDICATIF_SN}${digits}`;
}

/** Affichage lisible : +221 77 123 45 67 */
export function formatPhoneSN(value: string | null): string {
  if (!value) return "";
  const m = value.match(/^\+221(\d{2})(\d{3})(\d{2})(\d{2})$/);
  if (!m) return value;
  return `+221 ${m[1]} ${m[2]} ${m[3]} ${m[4]}`;
}

/** Villes principales du Sénégal pour les filtres. */
export const VILLES_SENEGAL = [
  "Dakar",
  "Thiès",
  "Saint-Louis",
  "Ziguinchor",
  "Touba",
  "Kaolack",
  "Mbour",
  "Rufisque",
  "Diourbel",
  "Louga",
  "Tambacounda",
  "Kolda",
];

export const SPECIALITES = [
  "Médecine générale",
  "Cardiologie",
  "Pédiatrie",
  "Dermatologie",
  "Gynécologie",
  "Ophtalmologie",
  "Dentiste",
  "Psychiatrie",
  "ORL",
  "Radiologie",
];
