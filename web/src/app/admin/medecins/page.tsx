"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { CreateMedecinPayload, MedecinAdminItem } from "@/lib/types";

const EMPTY: CreateMedecinPayload = {
  email: "",
  password: "",
  nom: "",
  prenom: "",
  specialite: "",
  numero_ordre: "",
  structure_sante: "",
  telephone: "",
  ville: "",
};

export default function AdminMedecinsPage() {
  const [medecins, setMedecins] = useState<MedecinAdminItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<CreateMedecinPayload>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setMedecins(await api.listMedecinsAdmin());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur de chargement.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const update =
    (key: keyof CreateMedecinPayload) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFeedback(null);
    setSubmitting(true);
    try {
      // Nettoie les champs optionnels vides
      const payload: CreateMedecinPayload = { ...form };
      (["numero_ordre", "structure_sante", "telephone", "ville"] as const).forEach((k) => {
        if (!payload[k]) delete payload[k];
      });
      const created = await api.createMedecin(payload);
      setFeedback(`Médecin créé : Dr ${created.prenom} ${created.nom}`);
      setForm(EMPTY);
      await load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Création impossible.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (m: MedecinAdminItem) => {
    setError(null);
    setActingId(m.id);
    try {
      if (m.is_active) await api.deactivateMedecin(m.id);
      else await api.activateMedecin(m.id);
      // Mise à jour optimiste du statut
      setMedecins((prev) =>
        prev.map((x) => (x.id === m.id ? { ...x, is_active: !x.is_active } : x)),
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Action impossible.");
    } finally {
      setActingId(null);
    }
  };

  const inputCls =
    "w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500";

  return (
    <div>
      {/* Création */}
      <form onSubmit={handleCreate} className="mb-8 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 font-semibold text-slate-900">Créer un compte médecin</h2>
        {formError && (
          <div className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</div>
        )}
        {feedback && (
          <div className="mb-3 rounded-md bg-brand-50 px-3 py-2 text-sm text-brand-800">{feedback}</div>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <input required value={form.prenom} onChange={update("prenom")} placeholder="Prénom" className={inputCls} />
          <input required value={form.nom} onChange={update("nom")} placeholder="Nom" className={inputCls} />
          <input required type="email" value={form.email} onChange={update("email")} placeholder="Email" className={inputCls} />
          <input required type="password" value={form.password} onChange={update("password")} placeholder="Mot de passe (8+, maj, chiffre)" className={inputCls} />
          <input required value={form.specialite} onChange={update("specialite")} placeholder="Spécialité" className={inputCls} />
          <input value={form.numero_ordre} onChange={update("numero_ordre")} placeholder="N° d'ordre" className={inputCls} />
          <input value={form.structure_sante} onChange={update("structure_sante")} placeholder="Structure de santé" className={inputCls} />
          <input value={form.ville} onChange={update("ville")} placeholder="Ville" className={inputCls} />
          <input value={form.telephone} onChange={update("telephone")} placeholder="Téléphone (+221…)" className={inputCls} />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="mt-4 rounded-md bg-brand-600 px-5 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {submitting ? "Création…" : "Créer le médecin"}
        </button>
      </form>

      {/* Liste */}
      <h2 className="mb-3 font-semibold text-slate-900">Médecins ({medecins.length})</h2>
      {error && <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      {loading ? (
        <p className="text-slate-500">Chargement…</p>
      ) : (
        <ul className="space-y-2">
          {medecins.map((m) => (
            <li
              key={m.id}
              className={`flex items-center justify-between rounded-lg border bg-white px-4 py-3 ${
                m.is_active ? "border-slate-200" : "border-slate-200 opacity-60"
              }`}
            >
              <div>
                <p className="font-medium text-slate-900">
                  Dr {m.prenom} {m.nom}
                  <span className="ml-2 text-sm font-normal text-brand-700">{m.specialite}</span>
                </p>
                <p className="text-sm text-slate-500">
                  {[m.structure_sante, m.ville].filter(Boolean).join(" · ")}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    m.is_active ? "bg-brand-100 text-brand-800" : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {m.is_active ? "Actif" : "Inactif"}
                </span>
                <button
                  onClick={() => handleToggle(m)}
                  disabled={actingId === m.id}
                  className={`rounded-md border px-3 py-1.5 text-sm disabled:opacity-60 ${
                    m.is_active
                      ? "border-red-300 text-red-700 hover:bg-red-50"
                      : "border-brand-300 text-brand-700 hover:bg-brand-50"
                  }`}
                >
                  {actingId === m.id ? "…" : m.is_active ? "Désactiver" : "Réactiver"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
