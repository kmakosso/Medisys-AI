"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { NotificationBell } from "./NotificationBell";

export function Navbar() {
  const { user, logout, loading } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold text-brand-700">
          <span className="inline-block h-6 w-6 rounded-md bg-brand-600" />
          Medisys AI
        </Link>

        <nav className="flex items-center gap-4 text-sm">
          <Link href="/medecins" className="text-slate-600 hover:text-brand-700">
            Médecins
          </Link>
          {user?.role === "patient" && (
            <>
              <Link href="/rendez-vous" className="text-slate-600 hover:text-brand-700">
                Mes rendez-vous
              </Link>
              <Link href="/dossier" className="text-slate-600 hover:text-brand-700">
                Mon dossier
              </Link>
              <Link href="/profil" className="text-slate-600 hover:text-brand-700">
                Mon profil
              </Link>
            </>
          )}
          {user?.role === "medecin" && (
            <Link href="/medecin/rendez-vous" className="text-slate-600 hover:text-brand-700">
              Espace médecin
            </Link>
          )}
          {user?.role === "admin" && (
            <Link href="/admin/medecins" className="text-slate-600 hover:text-brand-700">
              Admin
            </Link>
          )}

          {loading ? null : user ? (
            <div className="flex items-center gap-3">
              <NotificationBell />
              <span className="hidden text-slate-500 sm:inline">{user.email}</span>
              <button
                onClick={handleLogout}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50"
              >
                Déconnexion
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="rounded-md px-3 py-1.5 text-slate-700 hover:bg-slate-50"
              >
                Connexion
              </Link>
              <Link
                href="/register"
                className="rounded-md bg-brand-600 px-3 py-1.5 font-medium text-white hover:bg-brand-700"
              >
                Inscription
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
