import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { authBridge, refreshStore } from "@/shared/stores/authStore";
import type { TokenResponse } from "@/shared/types";

const API_URL = (import.meta.env.VITE_API_URL ?? "http://localhost:8000").replace(/\/$/, "");

export const apiClient = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: { "Content-Type": "application/json" },
});

// Joint l'access token courant à chaque requête
apiClient.interceptors.request.use((config) => {
  const token = authBridge.getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Rafraîchissement automatique sur 401 (une seule tentative, dédupliquée)
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refresh = refreshStore.get();
  if (!refresh) return null;
  if (!refreshPromise) {
    refreshPromise = axios
      .post<TokenResponse>(`${API_URL}/api/v1/auth/refresh`, { refresh_token: refresh })
      .then((res) => {
        refreshStore.set(res.data.refresh_token);
        authBridge.setAccessToken(res.data.access_token);
        return res.data.access_token;
      })
      .catch(() => {
        authBridge.clear();
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

apiClient.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true;
      const newToken = await refreshAccessToken();
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(original);
      }
    }
    return Promise.reject(error);
  },
);

/** Extrait un message d'erreur lisible d'une erreur Axios/FastAPI. */
export function apiErrorMessage(error: unknown, fallback = "Une erreur est survenue"): string {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      return detail
        .map((d: { loc?: string[]; msg: string }) => d.msg)
        .join(" ; ");
    }
    if (error.code === "ERR_NETWORK") return "Serveur injoignable. Réessayez plus tard.";
  }
  return fallback;
}
