import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search } from "lucide-react";
import { useMedecinsSearch } from "@/shared/hooks/useMedecins";
import { Button } from "@/shared/ui/Button";
import { Input, Select } from "@/shared/ui/Input";
import { SkeletonCards } from "@/shared/ui/Skeleton";
import { ErrorState } from "@/shared/ui/ErrorState";
import { DoctorCard } from "@/patient/components/DoctorCard";
import { SPECIALITES, VILLES_SENEGAL } from "@/shared/utils/formatPhone";

export function SearchPage() {
  const [params] = useSearchParams();
  const [specialite, setSpecialite] = useState(params.get("specialite") ?? "");
  const [ville, setVille] = useState(params.get("ville") ?? "");
  const [q, setQ] = useState("");
  const [applied, setApplied] = useState({
    specialite: params.get("specialite") ?? "",
    ville: params.get("ville") ?? "",
    q: "",
  });

  const { data, isLoading, isError, refetch } = useMedecinsSearch({
    specialite: applied.specialite || undefined,
    ville: applied.ville || undefined,
    q: applied.q || undefined,
    tri: "dispo",
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setApplied({ specialite, ville, q });
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Trouver un médecin</h1>

      <form onSubmit={submit} className="mb-6 flex flex-wrap gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <Select value={specialite} onChange={(e) => setSpecialite(e.target.value)} className="flex-1">
          <option value="">Toutes spécialités</option>
          {SPECIALITES.map((s) => <option key={s} value={s}>{s}</option>)}
        </Select>
        <Select value={ville} onChange={(e) => setVille(e.target.value)} className="flex-1">
          <option value="">Toutes villes</option>
          {VILLES_SENEGAL.map((v) => <option key={v} value={v}>{v}</option>)}
        </Select>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom du médecin" className="flex-1" />
        <Button type="submit"><Search className="h-4 w-4" /> Rechercher</Button>
      </form>

      {isLoading ? (
        <SkeletonCards />
      ) : isError ? (
        <ErrorState message="Impossible de charger les médecins." onRetry={() => refetch()} />
      ) : !data || data.length === 0 ? (
        <p className="text-slate-500">Aucun médecin trouvé.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {data.map((m) => <DoctorCard key={m.id} m={m} />)}
        </div>
      )}
    </div>
  );
}
