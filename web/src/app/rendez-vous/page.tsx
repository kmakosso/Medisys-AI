"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDateTime, STATUT_LABELS, STATUT_STYLES } from "@/lib/format";
import type { MedecinListItem, RendezVous } from "@/lib/types";

export default function RendezVousPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [rdvs, setRdvs] = useState<RendezVous[]>([]);
  const [medecins, setMedecins] = useState<Record<string, MedecinListItem>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  // Garde d'authentification
  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const page = await api.listRendezVous({ size: 100 });
      setRdvs(page.items);

      // Récupère les infos des médecins concernés (déduplication)
      const ids = Array.from(new Set(page.items.map((r) => r.medecin_id)));
      const entries = await Promise.all(
        ids.map(async (id) => {
          try {
            const m = await api.getMedecin(id);
            return [id, m] as const;
          } catch {
            return null;
          }
        }),
      );
      const map: Record<string, MedecinListItem> = {};
      for (const e of entries) if (e) map[e[0]] = e[1];
      setMedecins(map);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur de chargement.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleCancel = async (id: string) => {
    setActingId(id);
    try {
      const updated = await api.updateRendezVousStatut(id, "annule");
      setRdvs((prev) => prev.map((r) => (r.id === id ? updated : r)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Annulation impossible.");
    } finally {
      setActingId(null);
    }
  };

  if (authLoading || (!user && loading)) {
    return <p className="text-slate-500">Chargement…</p>;
  }
  if (!user) return null;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Mes rendez-vous</h1>

      {error && <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {loading ? (
        <p className="text-slate-500">Chargement…</p>
      ) : rdvs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <p className="text-slate-600">Vous n&apos;avez aucun rendez-vous.</p>
          <Link
            href="/medecins"
            className="mt-3 inline-block rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            Prendre rendez-vous
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {rdvs.map((r) => {
            const m = medecins[r.medecin_id];
            const annulable = r.statut === "demande" || r.statut === "confirme";
            return (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-5"
              >
                <div>
                  <p className="font-semibold text-slate-900">
                    {m ? `Dr ${m.prenom} ${m.nom}` : "Médecin"}
                    {m && <span className="ml-2 text-sm font-normal text-brand-700">{m.specialite}</span>}
                  </p>
                  {r.motif && <p className="text-sm text-slate-600">Motif : {r.motif}</p>}
                  <p className="mt-1 text-xs text-slate-400">Demandé le {formatDateTime(r.created_at)}</p>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      STATUT_STYLES[r.statut] ?? "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {STATUT_LABELS[r.statut] ?? r.statut}
                  </span>
                  {annulable && (
                    <button
                      onClick={() => handleCancel(r.id)}
                      disabled={actingId === r.id}
                      className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 disabled:opacity-60"
                    >
                      {actingId === r.id ? "…" : "Annuler"}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
