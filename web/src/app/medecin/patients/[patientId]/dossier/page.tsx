"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { formatDateTime, TYPE_ENTREE_LABELS } from "@/lib/format";
import type { EntreeDossier, PatientProfile, TypeEntree } from "@/lib/types";

const TYPES: TypeEntree[] = ["consultation", "ordonnance", "resultat", "note"];

export default function MedecinDossierPage() {
  const { patientId } = useParams<{ patientId: string }>();

  const [patient, setPatient] = useState<PatientProfile | null>(null);
  const [entrees, setEntrees] = useState<EntreeDossier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [type, setType] = useState<TypeEntree>("consultation");
  const [contenu, setContenu] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const p = await api.getPatient(patientId);
      setPatient(p);
      try {
        const dossier = await api.getDossier(patientId);
        setEntrees(
          [...dossier.entrees].sort((a, b) => b.date_entree.localeCompare(a.date_entree)),
        );
      } catch (err) {
        // 404 = dossier encore vide (aucune entrée)
        if (err instanceof ApiError && err.status === 404) setEntrees([]);
        else throw err;
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur de chargement.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!contenu.trim()) return;
    setSubmitting(true);
    try {
      const entree = await api.addDossierEntry(patientId, { type_entree: type, contenu });
      setEntrees((prev) => [entree, ...prev]);
      setContenu("");
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Ajout impossible.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <p className="text-slate-500">Chargement…</p>;

  return (
    <div>
      <Link
        href="/medecin/rendez-vous"
        className="mb-4 inline-block text-sm text-brand-700 hover:underline"
      >
        ← Retour aux rendez-vous
      </Link>

      {error && <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

      {patient && (
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-slate-900">
            Dossier de {patient.prenom} {patient.nom}
          </h2>
          <div className="mt-1 text-sm text-slate-600">
            {patient.telephone && <span className="mr-3">{patient.telephone}</span>}
            {patient.ville && <span>{patient.ville}</span>}
          </div>
        </div>
      )}

      {/* Ajout d'une entrée */}
      <form onSubmit={handleAdd} className="mb-8 rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="mb-3 font-semibold text-slate-900">Ajouter une entrée</h3>
        {formError && (
          <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</div>
        )}
        <div className="mb-3">
          <label className="mb-1 block text-sm font-medium text-slate-700">Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as TypeEntree)}
            className="rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          >
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {TYPE_ENTREE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
        <div className="mb-3">
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Contenu (chiffré au repos)
          </label>
          <textarea
            value={contenu}
            onChange={(e) => setContenu(e.target.value)}
            rows={4}
            className="w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            placeholder="Observations, prescription, résultats…"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-brand-600 px-5 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {submitting ? "Enregistrement…" : "Enregistrer l'entrée"}
        </button>
      </form>

      {/* Historique */}
      <h3 className="mb-3 font-semibold text-slate-900">Historique du dossier</h3>
      {entrees.length === 0 ? (
        <p className="text-slate-500">Aucune entrée pour le moment.</p>
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
