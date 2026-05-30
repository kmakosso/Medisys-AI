import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CalendarCheck, Search, ShieldCheck, Stethoscope } from "lucide-react";
import { Logo } from "@/shared/ui/Logo";
import { Button } from "@/shared/ui/Button";
import { Select } from "@/shared/ui/Input";
import { SPECIALITES, VILLES_SENEGAL } from "@/shared/utils/formatPhone";

export function LandingPage() {
  const navigate = useNavigate();
  const [specialite, setSpecialite] = useState("");
  const [ville, setVille] = useState("");

  const search = (e: React.FormEvent) => {
    e.preventDefault();
    const qs = new URLSearchParams();
    if (specialite) qs.set("specialite", specialite);
    if (ville) qs.set("ville", ville);
    navigate(`/app/search?${qs.toString()}`);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header public */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Logo />
        <div className="flex items-center gap-2">
          <Link to="/login">
            <Button variant="ghost" size="sm">Connexion</Button>
          </Link>
          <Link to="/register">
            <Button size="sm">Créer un compte</Button>
          </Link>
        </div>
      </header>

      {/* Hero + recherche */}
      <section className="bg-gradient-to-br from-patient to-patient-700 px-4 py-16 text-white">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-3xl font-extrabold sm:text-4xl">
            Trouvez un médecin et prenez rendez-vous en ligne
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-patient-50">
            Partout au Sénégal — recherchez par spécialité et ville, comparez les disponibilités,
            réservez en quelques clics.
          </p>

          <form
            onSubmit={search}
            className="mx-auto mt-8 flex flex-col gap-2 rounded-2xl bg-white p-2 shadow-xl sm:flex-row"
          >
            <Select value={specialite} onChange={(e) => setSpecialite(e.target.value)} className="border-0 focus:ring-0">
              <option value="">Spécialité</option>
              {SPECIALITES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>
            <div className="hidden w-px bg-slate-200 sm:block" />
            <Select value={ville} onChange={(e) => setVille(e.target.value)} className="border-0 focus:ring-0">
              <option value="">Ville</option>
              {VILLES_SENEGAL.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </Select>
            <Button type="submit" size="lg" className="shrink-0">
              <Search className="h-4 w-4" /> Rechercher
            </Button>
          </form>
        </div>
      </section>

      {/* Comment ça marche */}
      <section className="mx-auto max-w-5xl px-4 py-16">
        <h2 className="mb-10 text-center text-2xl font-bold text-slate-900">Comment ça marche ?</h2>
        <div className="grid gap-6 sm:grid-cols-3">
          {[
            { icon: Search, t: "1. Rechercher", d: "Choisissez une spécialité et votre ville." },
            { icon: CalendarCheck, t: "2. Choisir", d: "Sélectionnez un créneau disponible." },
            { icon: Stethoscope, t: "3. Confirmer", d: "Validez et recevez une confirmation." },
          ].map((s) => (
            <div key={s.t} className="rounded-2xl border border-slate-200 p-6 text-center">
              <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-patient-50 text-patient">
                <s.icon className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-slate-900">{s.t}</h3>
              <p className="mt-1 text-sm text-slate-600">{s.d}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center gap-4">
          <Link to="/register">
            <Button size="lg">Prendre un rendez-vous</Button>
          </Link>
          <Link to="/pro" className="flex items-center gap-1 text-sm text-slate-500 hover:text-pro">
            <ShieldCheck className="h-4 w-4" /> Vous êtes médecin ? Accéder à MedisysAI Pro
          </Link>
        </div>
      </section>
    </div>
  );
}
