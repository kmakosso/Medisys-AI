import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useAuth } from "./useAuth";

/**
 * Déconnexion automatique après une période d'inactivité.
 * Médecin : 15 min (sécurité stricte). Patient : 30 min (déconnexion douce).
 */
export function useIdleLogout(minutes: number, message: string) {
  const { isAuthenticated, logout } = useAuth();
  const timer = useRef<number>();

  useEffect(() => {
    if (!isAuthenticated) return;
    const ms = minutes * 60 * 1000;

    const reset = () => {
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        logout();
        toast.warning(message);
      }, ms);
    };

    const events = ["mousedown", "keydown", "scroll", "touchstart"];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();

    return () => {
      window.clearTimeout(timer.current);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [isAuthenticated, minutes, message, logout]);
}
