import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/shared/hooks/useAuth";
import { Spinner } from "@/shared/ui/Spinner";

function FullPageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Spinner label="Chargement…" />
    </div>
  );
}

/** Route patient : exige une session avec le rôle patient. */
export function PatientRoute({ children }: { children: ReactNode }) {
  const { initialized, isAuthenticated, role } = useAuth();
  const location = useLocation();
  if (!initialized) return <FullPageLoader />;
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;
  if (role !== "patient") return <Navigate to="/pro/dashboard" replace />;
  return <>{children}</>;
}

/** Route pro : exige une session avec le rôle médecin ou admin. */
export function ProRoute({ children }: { children: ReactNode }) {
  const { initialized, isAuthenticated, role } = useAuth();
  const location = useLocation();
  if (!initialized) return <FullPageLoader />;
  if (!isAuthenticated) return <Navigate to="/pro/login" state={{ from: location }} replace />;
  if (role !== "medecin" && role !== "admin")
    return <Navigate to="/app/dashboard" replace />;
  return <>{children}</>;
}
