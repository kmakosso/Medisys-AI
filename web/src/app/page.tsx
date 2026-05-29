import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex flex-col items-center gap-8 py-10 text-center">
      <div className="space-y-4">
        <h1 className="text-4xl font-bold text-slate-900 sm:text-5xl">
          Vos rendez-vous médicaux,
          <br />
          <span className="text-brand-600">simplement et en sécurité</span>
        </h1>
        <p className="mx-auto max-w-xl text-lg text-slate-600">
          Trouvez un médecin près de chez vous, consultez ses créneaux disponibles et
          réservez en quelques clics. Vos données de santé sont chiffrées et protégées.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/medecins"
          className="rounded-lg bg-brand-600 px-6 py-3 font-medium text-white shadow-sm hover:bg-brand-700"
        >
          Trouver un médecin
        </Link>
        <Link
          href="/register"
          className="rounded-lg border border-slate-300 bg-white px-6 py-3 font-medium text-slate-700 hover:bg-slate-50"
        >
          Créer un compte
        </Link>
      </div>

      <div className="mt-8 grid gap-6 sm:grid-cols-3">
        {[
          { title: "Recherche par spécialité", desc: "Filtrez par spécialité et par ville." },
          { title: "Réservation en temps réel", desc: "Créneaux disponibles, sans double-réservation." },
          { title: "Données protégées", desc: "Chiffrement au repos, conformité ISO 27001." },
        ].map((f) => (
          <div key={f.title} className="rounded-xl border border-slate-200 bg-white p-5 text-left">
            <h3 className="font-semibold text-slate-900">{f.title}</h3>
            <p className="mt-1 text-sm text-slate-600">{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
