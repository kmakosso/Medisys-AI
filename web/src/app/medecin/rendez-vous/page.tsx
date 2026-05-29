"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { formatCreneau, STATUT_LABELS, STATUT_STYLES } from "@/lib/format";
import type { Disponibilite, RendezVous, StatutRDV } from "@/lib/types";

// Transitions autorisées côté médecin (miroir de la machine d'état backend).
const ACTIONS: Record<StatutRDV, { statut: StatutRDV; label: string; style: string }[]> = {
  demande: [
    { statut: "confirme", label: "Confirmer", style: "bg-brand-600 text-white hover:bg-brand-700" },
    { statut: "annule", label: "Refuser", style: "border border-red-300 text-red-700 hover:bg-red-50" },
  ],
  confirme: [
    { statut: "termine", label: "Terminer", style: "bg-slate-700 text-white hover:bg-slate-800" },
    { statut: "annule", label: "Annuler", style: "border border-red-300 text-red-700 hover:bg-red-50" },
  ],
  annule: [],
  termine: [],
};

export default function MedecinRendezVousPage() {
  const [rdvs, setRdvs] = useState<RendezVous[]>([]);
  const [slotMap, setSlotMap] = useState<Record<string, Disponibilite>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const me = await api.getMyMedecin();
      const [page, slots] = await Promise.all([
        api.listRendezVous({ size: 100 }),
        api.listAllDisponibilites(me.id),
      ]);
      const map: Record<string, Disponibilite> = {};
      for (const s of slots) map[s.id] = s;
      setSlotMap(map);
      // Tri : les demandes en attente d'abord, puis par date de créneau
      page.items.sort((a, b) => {
        const da = map[a.creneau_id]?.debut ?? "";
        const db = map[b.creneau_id]?.debut ?? "";
        return da.localeCompare(db);
      });
      setRdvs(page.items);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur de chargement.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleAction = async (id: string, statut: StatutRDV) => {
    setActingId(id);
    setError(null);
    try {
      const updated = await api.updateRendezVousStatut(id, statut);
      setRdvs((prev) => prev.map((r) => (r.id === id ? updated : r)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Action impossible.");
    } finally {
      setActingId(null);
    }
  };

  if (loading) return <p className="text-slate-500">Chargement…</p>;

  return (
    <div>
      {error && <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {rdvs.length === 0 ? (
        <p className="text-slate-500">Aucun rendez-vous pour le moment.</p>
      ) : (
        <ul className="space-y-3">
          {rdvs.map((r) => {
            const slot = slotMap[r.creneau_id];
            const actions = ACTIONS[r.statut] ?? [];
            return (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-5"
              >
                <div>
                  <p className="font-semibold text-slate-900">
                    {slot ? formatCreneau(slot.debut, slot.fin) : "Créneau"}
                  </p>
                  <p className="text-sm text-slate-600">
                    Patient&nbsp;
                    <span className="font-mono text-xs text-slate-400">
                      #{r.patient_id.slice(0, 8)}
                    </span>
                  </p>
                  {r.motif && <p className="text-sm text-slate-600">Motif : {r.motif}</p>}
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      STATUT_STYLES[r.statut] ?? "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {STATUT_LABELS[r.statut] ?? r.statut}
                  </span>
                  {actions.map((a) => (
                    <button
                      key={a.statut}
                      onClick={() => handleAction(r.id, a.statut)}
                      disabled={actingId === r.id}
                      className={`rounded-md px-3 py-1.5 text-sm font-medium disabled:opacity-60 ${a.style}`}
                    >
                      {actingId === r.id ? "…" : a.label}
                    </button>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-6 text-xs text-slate-400">
        Note : l&apos;identité complète du patient n&apos;est pas encore exposée par l&apos;API à
        ce stade (amélioration backend prévue). Seul un identifiant abrégé est affiché.
      </p>
    </div>
  );
}
