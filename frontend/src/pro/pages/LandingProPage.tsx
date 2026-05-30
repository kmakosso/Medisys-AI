import { Link } from "react-router-dom";
import { BrainCircuit, CalendarDays, FolderLock, ShieldCheck } from "lucide-react";
import { Logo } from "@/shared/ui/Logo";
import { Button } from "@/shared/ui/Button";

const FEATURES = [
  { icon: CalendarDays, t: "Agenda intelligent", d: "Gérez vos créneaux et rendez-vous en un coup d'œil." },
  { icon: FolderLock, t: "Dossiers patients", d: "Accédez aux dossiers médicaux chiffrés en toute sécurité." },
  { icon: BrainCircuit, t: "Rappels IA", d: "Réduisez les absences grâce aux rappels intelligents (à venir)." },
  { icon: ShieldCheck, t: "Sécurité des données", d: "Chiffrement, audit, conformité ISO 27001 / PSSI." },
];

export function LandingProPage() {
  return (
    <div className="min-h-screen bg-pro text-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
        <Logo pro onDark />
        <Link to="/pro/login">
          <Button variant="accent" size="sm">Se connecter</Button>
        </Link>
      </header>

      <section className="mx-auto max-w-4xl px-4 py-20 text-center">
        <h1 className="text-3xl font-extrabold sm:text-5xl">
          L&apos;outil numérique des professionnels de santé
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-slate-300">
          MedisysAI Pro centralise votre agenda, vos patients et leurs dossiers — pensé pour le
          contexte sénégalais et la sécurité des données de santé.
        </p>
        <div className="mt-8 flex justify-center">
          <Link to="/pro/login">
            <Button variant="accent" size="lg">Accéder à mon espace</Button>
          </Link>
        </div>
        <p className="mt-4 text-sm text-slate-400">
          Réservé aux professionnels de santé — compte créé par l&apos;administrateur.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-24">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.t} className="rounded-2xl border border-white/10 bg-pro-card p-6">
              <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-pro-accent/15 text-pro-accent">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-white">{f.t}</h3>
              <p className="mt-1 text-sm text-slate-400">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-white/10 py-6 text-center text-sm text-slate-500">
        <Link to="/" className="hover:text-slate-300">← Retour à l&apos;espace patient MedisysAI</Link>
      </footer>
    </div>
  );
}
