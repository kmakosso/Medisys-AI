import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { useAuth } from "@/shared/hooks/useAuth";
import { useIdleLogout } from "@/shared/hooks/useIdleLogout";
import { Logo } from "@/shared/ui/Logo";
import { Button } from "@/shared/ui/Button";
import { NotificationBell } from "@/shared/components/NotificationBell";
import { cn } from "@/shared/utils/cn";

const LINKS = [
  { to: "/app/dashboard", label: "Mes rendez-vous" },
  { to: "/app/search", label: "Rechercher" },
  { to: "/app/profile", label: "Mon profil" },
];

export function PatientLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  useIdleLogout(30, "Session expirée. Reconnectez-vous.");

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#f8f9fa]">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/app/dashboard">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-1 sm:flex">
            {LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  cn(
                    "rounded-lg px-3 py-2 text-sm font-medium",
                    isActive ? "bg-patient-50 text-patient-700" : "text-slate-600 hover:bg-slate-100",
                  )
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Déconnexion</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 bg-white py-6 text-center text-sm text-slate-400">
        MedisysAI — Prise de rendez-vous médicaux au Sénégal · {new Date().getFullYear()}
      </footer>
    </div>
  );
}
