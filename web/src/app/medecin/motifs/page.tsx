"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { Spinner } from "@/components/ui";
import type { Motif } from "@/lib/types";

export default function MedecinMotifsPage() {
  const [motifs, setMotifs] = useState<Motif[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [libelle, setLibelle] = useState("");
  const [duree, setDuree] = useState(30);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setMotifs(await api.listMyMotifs());
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
    if (!libelle.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const m = await api.createMotif({ libelle, duree_minutes: duree });
      setMotifs((prev) => [...prev, m]);
      setLibelle("");
      setDuree(30);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Création impossible.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteMotif(id);
      setMotifs((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Suppression impossible.");
    }
  };

  return (
    <div className="max-w-2xl">
      <p className="mb-4 text-sm text-slate-500">
        Les motifs proposés aux patients lors de la prise de rendez-vous.
      </p>

      <form onSubmit={handleCreate} className="mb-6 flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex-1">
          <label className="mb-1 block text-sm font-medium text-slate-700">Libellé</label>
          <input
            value={libelle}
            onChange={(e) => setLibelle(e.target.value)}
            placeholder="Ex : Première consultation"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Durée (min)</label>
          <input
            type="number"
            min={5}
            max={240}
            step={5}
            value={duree}
            onChange={(e) => setDuree(Number(e.target.value))}
            className="w-28 rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-brand-600 px-5 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          Ajouter
        </button>
      </form>

      {error && <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {loading ? (
        <Spinner />
      ) : motifs.length === 0 ? (
        <p className="text-slate-500">Aucun motif. Ajoutez-en pour faciliter la prise de RDV.</p>
      ) : (
        <ul className="space-y-2">
          {motifs.map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3"
            >
              <span className="text-slate-800">
                {m.libelle} <span className="text-sm text-slate-400">· {m.duree_minutes} min</span>
              </span>
              <button
                onClick={() => handleDelete(m.id)}
                className="rounded-md border border-red-300 px-3 py-1 text-sm text-red-700 hover:bg-red-50"
              >
                Supprimer
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
