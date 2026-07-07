import { useMemo, useState } from "react";
import { List, Map as MapIcon, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { useMedecinsSearch } from "@/shared/hooks/useMedecins";
import { useNetworkStatus } from "@/shared/hooks/useNetworkStatus";
import { ErrorState } from "@/shared/ui/ErrorState";
import { SkeletonCards } from "@/shared/ui/Skeleton";
import { Badge } from "@/shared/ui/Badge";
import { MedecinsMap } from "@/patient/components/maps/MedecinsMap";
import { MapFilters, type MapFiltersState } from "@/patient/components/maps/MapFilters";
import { DoctorCard } from "@/patient/components/DoctorCard";
import { DAKAR_CENTER, distanceKm, resolveCoords } from "@/shared/utils/geo";
import { dayKey } from "@/shared/utils/formatDate";
import { cn } from "@/shared/utils/cn";

export function CarteMedecinsPage() {
  const { isOnline } = useNetworkStatus();
  const [view, setView] = useState<"carte" | "liste">("carte");
  const [filters, setFilters] = useState<MapFiltersState>({
    specialite: "",
    rayon: null,
    disponibleAujourdhui: false,
  });
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const [locating, setLocating] = useState(false);

  const { data, isLoading, isError, refetch, isFetching } = useMedecinsSearch({
    specialite: filters.specialite || undefined,
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.filter((m) => {
      if (filters.disponibleAujourdhui) {
        if (!m.prochain_creneau || dayKey(m.prochain_creneau) !== dayKey(new Date().toISOString())) {
          return false;
        }
      }
      if (filters.rayon && userPos) {
        const pos = resolveCoords(m.latitude, m.longitude, m.ville);
        if (!pos || distanceKm(userPos, pos) > filters.rayon) return false;
      }
      return true;
    });
  }, [data, filters, userPos]);

  const locate = () => {
    if (!navigator.geolocation) {
      toast.error("Géolocalisation non disponible sur cet appareil.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserPos([pos.coords.latitude, pos.coords.longitude]);
        setLocating(false);
      },
      () => {
        toast.error("Impossible d'obtenir votre position.");
        setLocating(false);
      },
      { timeout: 8000 },
    );
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Carte des médecins</h1>
          {!isOnline && data && (
            <Badge className="mt-1 bg-amber-100 text-amber-700">
              <WifiOff className="h-3 w-3" /> Données en cache
            </Badge>
          )}
        </div>
        <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
          <button
            onClick={() => setView("carte")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium",
              view === "carte" ? "bg-white text-patient-700 shadow-sm" : "text-slate-500",
            )}
          >
            <MapIcon className="h-4 w-4" /> Carte
          </button>
          <button
            onClick={() => setView("liste")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium",
              view === "liste" ? "bg-white text-patient-700 shadow-sm" : "text-slate-500",
            )}
          >
            <List className="h-4 w-4" /> Liste
          </button>
        </div>
      </div>

      {isLoading ? (
        <SkeletonCards count={4} />
      ) : isError ? (
        <ErrorState message="Impossible de charger les médecins." onRetry={() => refetch()} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
          <MapFilters value={filters} onChange={setFilters} onLocate={locate} locating={locating} />

          {view === "carte" ? (
            <div className="h-[600px] overflow-hidden rounded-2xl">
              <MedecinsMap medecins={filtered} center={userPos ?? DAKAR_CENTER} zoom={userPos ? 13 : 12} />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-slate-500">Aucun médecin trouvé pour ces filtres.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {filtered.map((m) => (
                <DoctorCard key={m.id} m={m} />
              ))}
            </div>
          )}
        </div>
      )}
      {isFetching && !isLoading && <p className="mt-2 text-xs text-slate-400">Actualisation…</p>}
    </div>
  );
}
