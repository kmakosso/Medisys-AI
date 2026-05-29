"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { formatCreneau } from "@/lib/format";
import type { Disponibilite } from "@/lib/types";

export default function MedecinDisponibilitesPage() {
  const [slots, setSlots] = useState<Disponibilite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [debut, setDebut] = useState("");
  const [fin, setFin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const me = await api.getMyMedecin();
      const all = await api.listAllDisponibilites(me.id);
      // Tri chronologique
      all.sort((a, b) => a.debut.localeCompare(b.debut));
      setSlots(all);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur de chargement.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!debut || !fin) return;
    if (new Date(fin) <= new Date(debut)) {
      setFormError("La fin doit être après le début.");
      return;
    }
    setSubmitting(true);
    try {
      await api.createDisponibilite({
        debut: new Date(debut).toISOString(),
        fin: new Date(fin).toISOString(),
      });
      setDebut("");
      setFin("");
      await load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Création impossible.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (slotId: string) => {
    try {
      await api.deleteDisponibilite(slotId);
      setSlots((prev) => prev.filter((s) => s.id !== slotId));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Suppression impossible.");
    }
  };

  return (
    <div>
      {/* Formulaire de création */}
      <form
        onSubmit={handleCreate}
        className="mb-8 rounded-xl border border-slate-200 bg-white p-5"
      >
        <h2 className="mb-3 font-semibold text-slate-900">Ajouter un créneau</h2>
        {formError && (
          <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</div>
        )}
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Début</label>
            <input
              type="datetime-local"
              required
              value={debut}
              onChange={(e) => setDebut(e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Fin</label>
            <input
              type="datetime-local"
              required
              value={fin}
              onChange={(e) => setFin(e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-brand-600 px-5 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {submitting ? "Ajout…" : "Ajouter"}
          </button>
        </div>
      </form>

      {/* Liste des créneaux */}
      <h2 className="mb-3 font-semibold text-slate-900">Mes créneaux</h2>
      {error && <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {loading ? (
        <p className="text-slate-500">Chargement…</p>
      ) : slots.length === 0 ? (
        <p className="text-slate-500">Aucun créneau pour le moment.</p>
      ) : (
        <ul className="space-y-2">
          {slots.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3"
            >
              <span className="text-sm text-slate-700">{formatCreneau(s.debut, s.fin)}</span>
              <div className="flex items-center gap-3">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    s.statut === "libre"
                      ? "bg-brand-100 text-brand-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {s.statut === "libre" ? "Libre" : "Réservé"}
                </span>
                {s.statut === "libre" && (
                  <button
                    onClick={() => handleDelete(s.id)}
                    className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50"
                  >
                    Supprimer
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
