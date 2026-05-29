"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Sexe } from "@/lib/types";

const SEXES: { value: Sexe; label: string }[] = [
  { value: "masculin", label: "Masculin" },
  { value: "feminin", label: "Féminin" },
  { value: "autre", label: "Autre" },
];

export default function ProfilPatientPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState({
    prenom: "",
    nom: "",
    date_naissance: "",
    sexe: "" as Sexe | "",
    telephone: "",
    adresse: "",
    ville: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) router.replace("/login");
    else if (user.role !== "patient") router.replace("/");
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user || user.role !== "patient") return;
    (async () => {
      try {
        const p = await api.getMyPatient();
        setForm({
          prenom: p.prenom ?? "",
          nom: p.nom ?? "",
          date_naissance: p.date_naissance ?? "",
          sexe: p.sexe ?? "",
          telephone: p.telephone ?? "",
          adresse: p.adresse ?? "",
          ville: p.ville ?? "",
        });
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Erreur de chargement.");
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const update =
    (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFeedback(null);
    setSaving(true);
    try {
      await api.updateMyPatient({
        prenom: form.prenom,
        nom: form.nom,
        date_naissance: form.date_naissance || null,
        sexe: form.sexe || null,
        telephone: form.telephone || null,
        adresse: form.adresse || null,
        ville: form.ville || null,
      });
      setFeedback("Profil mis à jour.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || !user || user.role !== "patient" || loading) {
    return <p className="text-slate-500">Chargement…</p>;
  }

  const inputCls =
    "w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500";

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Mon profil</h1>

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

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Date de naissance</label>
            <input type="date" value={form.date_naissance} onChange={update("date_naissance")} className={inputCls} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Sexe</label>
            <select value={form.sexe} onChange={update("sexe")} className={inputCls}>
              <option value="">—</option>
              {SEXES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
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
          <label className="mb-1 block text-sm font-medium text-slate-700">Adresse</label>
          <input value={form.adresse} onChange={update("adresse")} className={inputCls} />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Ville</label>
          <input value={form.ville} onChange={update("ville")} className={inputCls} />
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
