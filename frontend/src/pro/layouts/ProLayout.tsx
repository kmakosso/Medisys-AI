import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Stethoscope,
  Users,
} from "lucide-react";
import { useAuth } from "@/shared/hooks/useAuth";
import { useIdleLogout } from "@/shared/hooks/useIdleLogout";
import { Logo } from "@/shared/ui/Logo";
import { NotificationBell } from "@/shared/components/NotificationBell";
import { cn } from "@/shared/utils/cn";

const NAV = [
  { to: "/pro/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { to: "/pro/agenda", label: "Mon agenda", icon: CalendarDays },
  { to: "/pro/patients", label: "Mes patients", icon: Users },
  { to: "/pro/disponibilites", label: "Disponibilités", icon: ClipboardList },
  { to: "/pro/profile", label: "Mon profil", icon: Stethoscope },
];

export function ProLayout() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  useIdleLogout(15, "Session expirée pour des raisons de sécurité.");

  const handleLogout = () => {
    logout();
    navigate("/pro/login");
  };

  return (
    <div className="flex min-h-screen bg-slate-100 text-slate-900">
      {/* Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col bg-pro-sidebar text-slate-200 md:flex">
        <div className="px-5 py-5">
          <Logo pro onDark />
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition",
                  isActive
                    ? "bg-pro-accent/15 text-pro-accent"
                    : "text-slate-300 hover:bg-white/5 hover:text-white",
                )
              }
            >
              <Icon className="h-5 w-5" /> {label}
            </NavLink>
          ))}
        </nav>
        <button
          onClick={handleLogout}
          className="m-3 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-300 hover:bg-white/5 hover:text-white"
        >
          <LogOut className="h-4 w-4" /> Déconnexion
        </button>
      </aside>

      {/* Contenu */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
          <span className="text-sm text-slate-500">{user?.email}</span>
          <div className="flex items-center gap-2">
            <NotificationBell theme="pro" />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
