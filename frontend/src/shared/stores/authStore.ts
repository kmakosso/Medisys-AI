import { create } from "zustand";
import type { TokenResponse, User } from "@/shared/types";

const REFRESH_KEY = "medisysai_refresh";

interface AuthState {
  user: User | null;
  /** Access token — gardé en mémoire uniquement (jamais en localStorage). */
  accessToken: string | null;
  /** Statut d'initialisation de session (au démarrage de l'app). */
  initialized: boolean;
  setSession: (tokens: TokenResponse) => void;
  setUser: (user: User | null) => void;
  setAccessToken: (token: string | null) => void;
  setInitialized: (v: boolean) => void;
  clear: () => void;
}

/** Le refresh token survit au rechargement (compromis : httpOnly cookie en prod). */
export const refreshStore = {
  get: (): string | null => localStorage.getItem(REFRESH_KEY),
  set: (token: string) => localStorage.setItem(REFRESH_KEY, token),
  clear: () => localStorage.removeItem(REFRESH_KEY),
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  initialized: false,
  setSession: (tokens) => {
    refreshStore.set(tokens.refresh_token);
    set({ accessToken: tokens.access_token });
  },
  setUser: (user) => set({ user }),
  setAccessToken: (accessToken) => set({ accessToken }),
  setInitialized: (initialized) => set({ initialized }),
  clear: () => {
    refreshStore.clear();
    set({ user: null, accessToken: null });
  },
}));

/** Accès hors-React (pour les intercepteurs Axios). */
export const authBridge = {
  getAccessToken: () => useAuthStore.getState().accessToken,
  setAccessToken: (t: string | null) => useAuthStore.getState().setAccessToken(t),
  clear: () => useAuthStore.getState().clear(),
};
