"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { formatFCFA } from "@/lib/format";
import { Avatar, DispoBadge, Spinner } from "@/components/ui";
import type { MedecinListItem } from "@/lib/types";

function MedecinsInner() {
  const params = useSearchParams();
  const [medecins, setMedecins] = useState<MedecinListItem[]>([]);
  const [specialite, setSpecialite] = useState(params.get("specialite") ?? "");
  const [ville, setVille] = useState(params.get("ville") ?? "");
  const [q, setQ] = useState("");
  const [tri, setTri] = useState<"pertinence" | "dispo">("dispo");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMedecins = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listMedecins({
        specialite: specialite || undefined,
        ville: ville || undefined,
        q: q || undefined,
        tri: tri === "dispo" ? "dispo" : undefined,
      });
      setMedecins(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Impossible de charger les médecins.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchMedecins();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tri]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    void fetchMedecins();
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Trouver un médecin</h1>

      <form
        onSubmit={handleSearch}
        className="mb-6 flex flex-wrap gap-3 rounded-2xl border border-slate-200 bg-white p-4"
      >
        <input
          value={specialite}
          onChange={(e) => setSpecialite(e.target.value)}
          placeholder="Spécialité"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
        />
        <input
          value={ville}
          onChange={(e) => setVille(e.target.value)}
          placeholder="Ville"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
        />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Nom du médecin"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
        />
        <button
          type="submit"
          className="rounded-lg bg-brand-600 px-5 py-2 font-medium text-white hover:bg-brand-700"
        >
          Rechercher
        </button>
      </form>

      <div className="mb-4 flex items-center gap-2 text-sm">
        <span className="text-slate-500">Trier par :</span>
        {(["dispo", "pertinence"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTri(t)}
            className={`rounded-full px-3 py-1 ${
              tri === t ? "bg-brand-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"
            }`}
          >
            {t === "dispo" ? "Disponibilité" : "Pertinence"}
          </button>
        ))}
      </div>

      {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {loading ? (
        <Spinner />
      ) : medecins.length === 0 ? (
        <p className="text-slate-500">Aucun médecin trouvé.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {medecins.map((m) => (
            <Link
              key={m.id}
              href={`/medecins/${m.id}`}
              className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-brand-400 hover:shadow-sm"
            >
              <Avatar prenom={m.prenom} nom={m.nom} size="lg" />
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-slate-900">
                  Dr {m.prenom} {m.nom}
                </h3>
                <p className="text-sm font-medium text-brand-700">{m.specialite}</p>
                <div className="mt-1 space-y-0.5 text-sm text-slate-500">
                  {m.structure_sante && <p className="truncate">{m.structure_sante}</p>}
                  {m.ville && <p>{m.ville}</p>}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <DispoBadge iso={m.prochain_creneau} />
                  {formatFCFA(m.tarif_fcfa) && (
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                      {formatFCFA(m.tarif_fcfa)}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function MedecinsPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <MedecinsInner />
    </Suspense>
  );
}
