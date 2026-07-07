import { Crosshair } from "lucide-react";
import { Select } from "@/shared/ui/Input";
import { Button } from "@/shared/ui/Button";
import { SPECIALITES } from "@/shared/utils/formatPhone";

export interface MapFiltersState {
  specialite: string;
  rayon: number | null;
  disponibleAujourdhui: boolean;
}

export function MapFilters({
  value,
  onChange,
  onLocate,
  locating,
}: {
  value: MapFiltersState;
  onChange: (next: MapFiltersState) => void;
  onLocate: () => void;
  locating: boolean;
}) {
  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">Spécialité</label>
        <Select
          value={value.specialite}
          onChange={(e) => onChange({ ...value, specialite: e.target.value })}
        >
          <option value="">Toutes</option>
          {SPECIALITES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">Rayon</label>
        <Select
          value={value.rayon ?? ""}
          onChange={(e) => onChange({ ...value, rayon: e.target.value ? Number(e.target.value) : null })}
        >
          <option value="">Tout le Sénégal</option>
          <option value="5">5 km</option>
          <option value="10">10 km</option>
          <option value="20">20 km</option>
        </Select>
        {value.rayon && (
          <p className="mt-1 text-xs text-slate-400">Nécessite votre position.</p>
        )}
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={value.disponibleAujourdhui}
          onChange={(e) => onChange({ ...value, disponibleAujourdhui: e.target.checked })}
          className="rounded border-slate-300"
        />
        Disponible aujourd&apos;hui
      </label>

      <Button variant="outline" size="sm" className="w-full" onClick={onLocate} loading={locating}>
        <Crosshair className="h-4 w-4" /> Utiliser ma position
      </Button>
    </div>
  );
}
