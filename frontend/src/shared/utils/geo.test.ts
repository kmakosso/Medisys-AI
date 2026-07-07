import { describe, expect, it } from "vitest";
import { distanceKm, resolveCoords, VILLE_COORDS } from "./geo";

describe("geo", () => {
  it("resolveCoords utilise les coordonnées précises quand disponibles", () => {
    const coords = resolveCoords(14.7, -17.5, "Dakar");
    expect(coords).toEqual([14.7, -17.5]);
  });

  it("resolveCoords retombe sur le centroïde de la ville si lat/lng absents", () => {
    const coords = resolveCoords(null, null, "Thiès");
    expect(coords).toEqual(VILLE_COORDS["Thiès"]);
  });

  it("resolveCoords renvoie null si aucune donnée exploitable", () => {
    expect(resolveCoords(null, null, null)).toBeNull();
    expect(resolveCoords(null, null, "VilleInconnue")).toBeNull();
  });

  it("distanceKm calcule une distance cohérente entre Dakar et Thiès (~60-75km)", () => {
    const d = distanceKm(VILLE_COORDS.Dakar, VILLE_COORDS["Thiès"]);
    expect(d).toBeGreaterThan(50);
    expect(d).toBeLessThan(90);
  });

  it("distanceKm renvoie 0 pour un même point", () => {
    expect(distanceKm(VILLE_COORDS.Dakar, VILLE_COORDS.Dakar)).toBeCloseTo(0);
  });
});
