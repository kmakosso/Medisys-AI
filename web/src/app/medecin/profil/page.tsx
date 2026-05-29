"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";

export default function ProfilMedecinPage() {
  const [form, setForm] = useState({
    prenom: "",
    nom: "",
    specialite: "",
    numero_ordre: "",
    structure_sante: "",
    telephone: "",
    ville: "",
    adresse: "",
    langues: "",
    tarif_fcfa: "",
    bio: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const m = await api.getMyMedecin();
        setForm({
          prenom: m.prenom ?? "",
          nom: m.nom ?? "",
          specialite: m.specialite ?? "",
          numero_ordre: m.numero_ordre ?? "",
          structure_sante: m.structure_sante ?? "",
          telephone: m.telephone ?? "",
          ville: m.ville ?? "",
          adresse: m.adresse ?? "",
          langues: m.langues ?? "",
          tarif_fcfa: m.tarif_fcfa != null ? String(m.tarif_fcfa) : "",
          bio: m.bio ?? "",
        });
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Erreur de chargement.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const update =
    (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFeedback(null);
    setSaving(true);
    try {
      await api.updateMyMedecin({
        prenom: form.prenom,
        nom: form.nom,
        specialite: form.specialite,
        numero_ordre: form.numero_ordre || null,
        structure_sante: form.structure_sante || null,
        telephone: form.telephone || null,
        ville: form.ville || null,
        adresse: form.adresse || null,
        langues: form.langues || null,
        tarif_fcfa: form.tarif_fcfa ? Number(form.tarif_fcfa) : null,
        bio: form.bio || null,
      });
      setFeedback("Profil mis à jour.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-slate-500">Chargement…</p>;

  const inputCls =
    "w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500";

  return (
    <div className="max-w-2xl">
      <form onSubmit={handleSave} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
        {error && <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        {feedback && (
          <div className="rounded-md bg-brand-50 px-3 py-2 text-sm text-brand-800">{feedback}</div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Prénom</label>
            <input required value={form.prenom} onChange={update("prenom")} className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Nom</label>
            <input required value={form.nom} onChange={update("nom")} className={inputCls} />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Spécialité</label>
          <input required value={form.specialite} onChange={update("specialite")} className={inputCls} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">N° d&apos;ordre</label>
            <input value={form.numero_ordre} onChange={update("numero_ordre")} className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Ville</label>
            <input value={form.ville} onChange={update("ville")} className={inputCls} />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Structure de santé</label>
          <input value={form.structure_sante} onChange={update("structure_sante")} className={inputCls} />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Téléphone</label>
          <input
            value={form.telephone}
            onChange={update("telephone")}
            placeholder="+221XXXXXXXXX"
            className={inputCls}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Adresse du cabinet</label>
          <input value={form.adresse} onChange={update("adresse")} className={inputCls} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Langues (séparées par des virgules)
            </label>
            <input
              value={form.langues}
              onChange={update("langues")}
              placeholder="Français, Wolof"
              className={inputCls}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Tarif (FCFA)</label>
            <input
              type="number"
              min={0}
              step={500}
              value={form.tarif_fcfa}
              onChange={update("tarif_fcfa")}
              className={inputCls}
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Présentation (bio)</label>
          <textarea
            value={form.bio}
            onChange={update("bio")}
            rows={4}
            placeholder="Parcours, approche, spécialisations…"
            className={inputCls}
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-brand-600 px-5 py-2.5 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
      </form>
    </div>
  );
}
