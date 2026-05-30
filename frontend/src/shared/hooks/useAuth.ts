import { useCallback } from "react";
import { authApi, type RegisterPayload } from "@/shared/api/auth.api";
import { refreshStore, useAuthStore } from "@/shared/stores/authStore";
import type { Role, User } from "@/shared/types";

export function useAuth() {
  const { user, accessToken, initialized, setSession, setUser, setInitialized, clear } =
    useAuthStore();

  /** Restaure la session au démarrage (via refresh token persistant). */
  const initSession = useCallback(async () => {
    if (!refreshStore.get()) {
      setInitialized(true);
      return;
    }
    try {
      const me = await authApi.me(); // 401 -> intercepteur rafraîchit puis rejoue
      setUser(me);
    } catch {
      clear();
    } finally {
      setInitialized(true);
    }
  }, [setUser, setInitialized, clear]);

  const login = useCallback(
    async (email: string, password: string): Promise<User> => {
      const tokens = await authApi.login(email, password);
      setSession(tokens);
      const me = await authApi.me();
      setUser(me);
      return me;
    },
    [setSession, setUser],
  );

  const register = useCallback(
    async (payload: RegisterPayload): Promise<User> => {
      const tokens = await authApi.register(payload);
      setSession(tokens);
      const me = await authApi.me();
      setUser(me);
      return me;
    },
    [setSession, setUser],
  );

  const logout = useCallback(() => clear(), [clear]);

  return {
    user,
    role: user?.role as Role | undefined,
    isAuthenticated: Boolean(accessToken && user),
    initialized,
    initSession,
    login,
    register,
    logout,
  };
}
