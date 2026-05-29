"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const SPECIALITES = [
  "Cardiologie",
  "Pédiatrie",
  "Dermatologie",
  "Généraliste",
  "Gynécologie",
  "Ophtalmologie",
];

export default function HomePage() {
  const router = useRouter();
  const [specialite, setSpecialite] = useState("");
  const [ville, setVille] = useState("");

  const search = (e: React.FormEvent) => {
    e.preventDefault();
    const qs = new URLSearchParams();
    if (specialite) qs.set("specialite", specialite);
    if (ville) qs.set("ville", ville);
    router.push(`/medecins?${qs.toString()}`);
  };

  return (
    <div className="space-y-16">
      {/* Hero + recherche */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 to-brand-800 px-6 py-16 text-center text-white sm:px-12">
        <h1 className="mx-auto max-w-2xl text-3xl font-bold sm:text-4xl">
          Prenez rendez-vous avec un médecin près de chez vous
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-brand-50">
          Recherchez, comparez les disponibilités et réservez en ligne — partout au Sénégal.
        </p>

        <form
          onSubmit={search}
          className="mx-auto mt-8 flex max-w-2xl flex-col gap-2 rounded-2xl bg-white p-2 shadow-lg sm:flex-row"
        >
          <input
            value={specialite}
            onChange={(e) => setSpecialite(e.target.value)}
            placeholder="Spécialité, médecin…"
            className="flex-1 rounded-xl px-4 py-3 text-slate-900 outline-none"
          />
          <div className="hidden w-px bg-slate-200 sm:block" />
          <input
            value={ville}
            onChange={(e) => setVille(e.target.value)}
            placeholder="Ville"
            className="flex-1 rounded-xl px-4 py-3 text-slate-900 outline-none"
          />
          <button
            type="submit"
            className="rounded-xl bg-brand-600 px-6 py-3 font-medium text-white hover:bg-brand-700"
          >
            Rechercher
          </button>
        </form>

        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {SPECIALITES.map((s) => (
            <Link
              key={s}
              href={`/medecins?specialite=${encodeURIComponent(s)}`}
              className="rounded-full bg-white/15 px-3 py-1 text-sm text-white backdrop-blur hover:bg-white/25"
            >
              {s}
            </Link>
          ))}
        </div>
      </section>

      {/* Avantages */}
      <section className="grid gap-6 sm:grid-cols-3">
        {[
          { t: "Disponibilités en temps réel", d: "Voyez le prochain créneau libre et réservez instantanément." },
          { t: "Vos données protégées", d: "Dossier médical chiffré au repos, conformité ISO 27001." },
          { t: "Rappels intelligents", d: "Notifications de confirmation et rappels avant vos rendez-vous." },
        ].map((f) => (
          <div key={f.t} className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              ✓
            </div>
            <h3 className="font-semibold text-slate-900">{f.t}</h3>
            <p className="mt-1 text-sm text-slate-600">{f.d}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
