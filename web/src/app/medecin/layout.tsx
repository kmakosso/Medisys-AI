"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import type { ReactNode } from "react";
import { useAuth } from "@/lib/auth";

const TABS = [
  { href: "/medecin/rendez-vous", label: "Rendez-vous" },
  { href: "/medecin/disponibilites", label: "Mes créneaux" },
  { href: "/medecin/motifs", label: "Motifs" },
  { href: "/medecin/profil", label: "Mon profil" },
];

export default function MedecinLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Garde de rôle : seuls les médecins accèdent à cet espace
  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
    else if (user.role !== "medecin") router.replace("/");
  }, [user, loading, router]);

  if (loading || !user || user.role !== "medecin") {
    return <p className="text-slate-500">Chargement…</p>;
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-slate-900">Espace médecin</h1>
      <nav className="mb-6 flex gap-1 border-b border-slate-200">
        {TABS.map((t) => {
          const active = pathname === t.href;
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${
                active
                  ? "border-brand-600 text-brand-700"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>
      {children}
    </div>
  );
}
