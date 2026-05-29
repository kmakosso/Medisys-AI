"use client";

import { useEffect, useMemo, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { dayKey, dayLabel, formatHeure, JOURS_SEMAINE } from "@/lib/format";
import { Spinner } from "@/components/ui";
import type { Disponibilite } from "@/lib/types";

export default function MedecinDisponibilitesPage() {
  const [slots, setSlots] = useState<Disponibilite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Création unitaire
  const [debut, setDebut] = useState("");
  const [fin, setFin] = useState("");

  // Génération récurrente
  const [jours, setJours] = useState<number[]>([0, 1, 2, 3, 4]);
  const [hDebut, setHDebut] = useState("09:00");
  const [hFin, setHFin] = useState("17:00");
  const [duree, setDuree] = useState(30);
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const me = await api.getMyMedecin();
      const all = await api.listAllDisponibilites(me.id);
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

  const slotsByDay = useMemo(() => {
    const map = new Map<string, Disponibilite[]>();
    for (const s of slots) {
      const k = dayKey(s.debut);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(s);
    }
    return Array.from(map.entries());
  }, [slots]);

  const handleCreateOne = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFeedback(null);
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

  const toggleJour = (j: number) =>
    setJours((prev) => (prev.includes(j) ? prev.filter((x) => x !== j) : [...prev, j]));

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFeedback(null);
    if (jours.length === 0 || !dateDebut || !dateFin) {
      setFormError("Choisissez au moins un jour et une plage de dates.");
      return;
    }
    setSubmitting(true);
    try {
      const created = await api.createRecurringDispos({
        jours_semaine: jours,
        heure_debut: hDebut,
        heure_fin: hFin,
        duree_minutes: duree,
        date_debut: dateDebut,
        date_fin: dateFin,
      });
      setFeedback(`${created.length} créneau(x) généré(s).`);
      await load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Génération impossible.");
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

  const inputCls =
    "rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500";

  return (
    <div>
      {formError && <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</div>}
      {feedback && <div className="mb-4 rounded-md bg-brand-50 px-3 py-2 text-sm text-brand-800">{feedback}</div>}

      {/* Génération récurrente */}
      <form onSubmit={handleGenerate} className="mb-6 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 font-semibold text-slate-900">Générer des créneaux récurrents</h2>
        <div className="mb-3 flex flex-wrap gap-2">
          {JOURS_SEMAINE.map((j) => (
            <button
              key={j.value}
              type="button"
              onClick={() => toggleJour(j.value)}
              className={`rounded-full px-3 py-1 text-sm ${
                jours.includes(j.value)
                  ? "bg-brand-600 text-white"
                  : "bg-white text-slate-600 ring-1 ring-slate-200"
              }`}
            >
              {j.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">De</label>
            <input type="time" value={hDebut} onChange={(e) => setHDebut(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">À</label>
            <input type="time" value={hFin} onChange={(e) => setHFin(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Durée (min)</label>
            <input
              type="number"
              min={5}
              max={240}
              step={5}
              value={duree}
              onChange={(e) => setDuree(Number(e.target.value))}
              className={`w-24 ${inputCls}`}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Du</label>
            <input type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Au</label>
            <input type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} className={inputCls} />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-brand-600 px-5 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            Générer
          </button>
        </div>
      </form>

      {/* Création unitaire */}
      <form onSubmit={handleCreateOne} className="mb-8 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 font-semibold text-slate-900">Ajouter un créneau ponctuel</h2>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Début</label>
            <input type="datetime-local" value={debut} onChange={(e) => setDebut(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Fin</label>
            <input type="datetime-local" value={fin} onChange={(e) => setFin(e.target.value)} className={inputCls} />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg border border-brand-300 px-5 py-2 font-medium text-brand-700 hover:bg-brand-50 disabled:opacity-60"
          >
            Ajouter
          </button>
        </div>
      </form>

      <h2 className="mb-3 font-semibold text-slate-900">Mes créneaux ({slots.length})</h2>
      {error && <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {loading ? (
        <Spinner />
      ) : slotsByDay.length === 0 ? (
        <p className="text-slate-500">Aucun créneau pour le moment.</p>
      ) : (
        <div className="space-y-5">
          {slotsByDay.map(([key, daySlots]) => (
            <div key={key}>
              <h3 className="mb-2 text-sm font-semibold capitalize text-slate-700">
                {dayLabel(daySlots[0].debut)}
              </h3>
              <div className="flex flex-wrap gap-2">
                {daySlots.map((s) => (
                  <span
                    key={s.id}
                    className={`group inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm ${
                      s.statut === "libre"
                        ? "border-brand-200 bg-brand-50 text-brand-700"
                        : "border-amber-200 bg-amber-50 text-amber-700"
                    }`}
                  >
                    {formatHeure(s.debut)}
                    {s.statut === "libre" ? (
                      <button
                        onClick={() => handleDelete(s.id)}
                        title="Supprimer"
                        className="ml-1 text-brand-400 hover:text-red-600"
                      >
                        ✕
                      </button>
                    ) : (
                      <span className="ml-1 text-[10px] uppercase">réservé</span>
                    )}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
