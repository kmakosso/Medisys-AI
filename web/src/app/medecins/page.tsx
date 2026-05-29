"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { MedecinListItem } from "@/lib/types";

export default function MedecinsPage() {
  const [medecins, setMedecins] = useState<MedecinListItem[]>([]);
  const [specialite, setSpecialite] = useState("");
  const [ville, setVille] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMedecins = async (filters: { specialite?: string; ville?: string }) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listMedecins(filters);
      setMedecins(data);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Impossible de charger les médecins (serveur ?).",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchMedecins({});
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    void fetchMedecins({ specialite: specialite || undefined, ville: ville || undefined });
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Trouver un médecin</h1>

      <form onSubmit={handleSearch} className="mb-6 flex flex-wrap gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <input
          value={specialite}
          onChange={(e) => setSpecialite(e.target.value)}
          placeholder="Spécialité (ex: Cardiologie)"
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
        />
        <input
          value={ville}
          onChange={(e) => setVille(e.target.value)}
          placeholder="Ville (ex: Dakar)"
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
        />
        <button
          type="submit"
          className="rounded-md bg-brand-600 px-5 py-2 font-medium text-white hover:bg-brand-700"
        >
          Rechercher
        </button>
      </form>

      {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {loading ? (
        <p className="text-slate-500">Chargement…</p>
      ) : medecins.length === 0 ? (
        <p className="text-slate-500">Aucun médecin trouvé.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {medecins.map((m) => (
            <Link
              key={m.id}
              href={`/medecins/${m.id}`}
              className="block rounded-xl border border-slate-200 bg-white p-5 transition hover:border-brand-400 hover:shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900">
                    Dr {m.prenom} {m.nom}
                  </h3>
                  <p className="text-sm font-medium text-brand-700">{m.specialite}</p>
                </div>
                <span className="rounded-md bg-brand-50 px-2 py-1 text-xs text-brand-700">Voir →</span>
              </div>
              <div className="mt-3 space-y-0.5 text-sm text-slate-600">
                {m.structure_sante && <p>{m.structure_sante}</p>}
                {m.ville && <p>{m.ville}</p>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
