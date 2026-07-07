/** Centroïdes approximatifs des principales villes du Sénégal.
 * Utilisés en secours quand un médecin n'a pas de coordonnées précises. */
export const VILLE_COORDS: Record<string, [number, number]> = {
  Dakar: [14.6928, -17.4467],
  Thiès: [14.7910, -16.9359],
  "Saint-Louis": [16.0179, -16.4896],
  Ziguinchor: [12.5833, -16.2719],
  Touba: [14.8667, -15.8833],
  Kaolack: [14.1652, -16.0726],
  Mbour: [14.4198, -16.9646],
  Rufisque: [14.7167, -17.2667],
  Diourbel: [14.6559, -16.2340],
  Louga: [15.6144, -16.2258],
  Tambacounda: [13.7707, -13.6673],
  Kolda: [12.8939, -14.9412],
};

export const DAKAR_CENTER: [number, number] = [14.6928, -17.4467];

/** Résout des coordonnées pour un médecin : lat/lng propres, sinon centroïde de la ville. */
export function resolveCoords(
  latitude: number | null | undefined,
  longitude: number | null | undefined,
  ville: string | null | undefined,
): [number, number] | null {
  if (latitude != null && longitude != null) return [latitude, longitude];
  if (ville && VILLE_COORDS[ville]) return VILLE_COORDS[ville];
  return null;
}

/** Distance en kilomètres entre deux points (formule de Haversine). */
export function distanceKm(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLon = ((b[1] - a[1]) * Math.PI) / 180;
  const lat1 = (a[0] * Math.PI) / 180;
  const lat2 = (b[0] * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Couleur de marqueur par spécialité (palette simple et lisible). */
const SPECIALITE_COLORS: Record<string, string> = {
  "Médecine générale": "#1a73e8",
  Cardiologie: "#ea4335",
  Pédiatrie: "#34a853",
  Dermatologie: "#f9ab00",
  Gynécologie: "#a142f4",
  Ophtalmologie: "#00acc1",
  Dentiste: "#546e7a",
  Psychiatrie: "#8d6e63",
  ORL: "#d81b60",
  Radiologie: "#5c6bc0",
};

export function couleurSpecialite(specialite: string): string {
  return SPECIALITE_COLORS[specialite] ?? "#64748b";
}
