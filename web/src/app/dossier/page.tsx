"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDateTime, TYPE_ENTREE_LABELS } from "@/lib/format";
import type { EntreeDossier } from "@/lib/types";

export default function MonDossierPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [entrees, setEntrees] = useState<EntreeDossier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Garde : patient connecté uniquement
  useEffect(() => {
    if (authLoading) return;
    if (!user) router.replace("/login");
    else if (user.role !== "patient") router.replace("/");
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user || user.role !== "patient") return;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const me = await api.getMyPatient();
        try {
          const dossier = await api.getDossier(me.id);
          setEntrees(
            [...dossier.entrees].sort((a, b) => b.date_entree.localeCompare(a.date_entree)),
          );
        } catch (err) {
          if (err instanceof ApiError && err.status === 404) setEntrees([]);
          else throw err;
        }
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Erreur de chargement.");
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  if (authLoading || !user || user.role !== "patient") {
    return <p className="text-slate-500">Chargement…</p>;
  }

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-slate-900">Mon dossier médical</h1>
      <p className="mb-6 text-sm text-slate-500">
        Consultation en lecture seule. Seuls vos médecins peuvent ajouter des entrées.
      </p>

      {error && <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {loading ? (
        <p className="text-slate-500">Chargement…</p>
      ) : entrees.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600">
          Votre dossier ne contient aucune entrée pour le moment.
        </div>
      ) : (
        <ul className="space-y-3">
          {entrees.map((en) => (
            <li key={en.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="mb-1 flex items-center justify-between">
                <span className="rounded-md bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
                  {TYPE_ENTREE_LABELS[en.type_entree] ?? en.type_entree}
                </span>
                <span className="text-xs text-slate-400">{formatDateTime(en.date_entree)}</span>
              </div>
              <p className="whitespace-pre-wrap text-sm text-slate-700">{en.contenu}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
