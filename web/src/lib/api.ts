// Client API typé pour le backend FastAPI v1.
// Gère le stockage des tokens JWT et le refresh automatique sur 401.

import type {
  CreateDisponibilitePayload,
  CreateEntreePayload,
  CreateMedecinPayload,
  CreateRendezVousPayload,
  Disponibilite,
  DossierMedical,
  EntreeDossier,
  LoginPayload,
  MedecinAdminItem,
  MedecinListItem,
  MedecinProfile,
  MedecinProfileUpdate,
  PaginatedRendezVous,
  PatientProfile,
  PatientProfileUpdate,
  RegisterPayload,
  RendezVous,
  StatutRDV,
  TokenResponse,
  User,
} from "./types";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:8000";

const ACCESS_KEY = "medisys_access";
const REFRESH_KEY = "medisys_refresh";

// ─── Token storage ─────────────────────────────────────────────────────────

export const tokenStore = {
  get access(): string | null {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(ACCESS_KEY);
  },
  get refresh(): string | null {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(REFRESH_KEY);
  },
  set(tokens: TokenResponse) {
    window.localStorage.setItem(ACCESS_KEY, tokens.access_token);
    window.localStorage.setItem(REFRESH_KEY, tokens.refresh_token);
  },
  clear() {
    window.localStorage.removeItem(ACCESS_KEY);
    window.localStorage.removeItem(REFRESH_KEY);
  },
};

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// Extrait un message lisible depuis une réponse d'erreur FastAPI.
async function extractError(res: Response): Promise<string> {
  try {
    const data = await res.json();
    if (typeof data.detail === "string") return data.detail;
    if (Array.isArray(data.detail)) {
      return data.detail
        .map((d: { loc?: string[]; msg: string }) => {
          const field = d.loc?.slice(1).join(".") ?? "";
          return field ? `${field} : ${d.msg}` : d.msg;
        })
        .join(" ; ");
    }
    return JSON.stringify(data);
  } catch {
    return `Erreur ${res.status}`;
  }
}

// ─── Refresh logic ───────────────────────────────────────────────────────────

let refreshPromise: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  const refresh = tokenStore.refresh;
  if (!refresh) return false;

  // Dédupe les refresh concurrents
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch(`${API_URL}/api/v1/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: refresh }),
        });
        if (!res.ok) {
          tokenStore.clear();
          return false;
        }
        const tokens: TokenResponse = await res.json();
        tokenStore.set(tokens);
        return true;
      } catch {
        return false;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

// ─── Core fetch ────────────────────────────────────────────────────────────

interface RequestOptions {
  method?: string;
  body?: unknown;
  auth?: boolean; // attacher le token (défaut: true)
  retry?: boolean; // usage interne pour le retry après refresh
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, auth = true, retry = true } = opts;

  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth && tokenStore.access) {
    headers["Authorization"] = `Bearer ${tokenStore.access}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // Refresh + retry une seule fois sur 401
  if (res.status === 401 && auth && retry) {
    const ok = await tryRefresh();
    if (ok) {
      return request<T>(path, { ...opts, retry: false });
    }
  }

  if (!res.ok) {
    throw new ApiError(res.status, await extractError(res));
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ─── Endpoints ─────────────────────────────────────────────────────────────

export const api = {
  // Auth
  register: (payload: RegisterPayload) =>
    request<TokenResponse>("/api/v1/auth/register", {
      method: "POST",
      body: payload,
      auth: false,
    }),

  login: (payload: LoginPayload) =>
    request<TokenResponse>("/api/v1/auth/login", {
      method: "POST",
      body: payload,
      auth: false,
    }),

  me: () => request<User>("/api/v1/auth/me"),

  // Médecins
  listMedecins: (params: { specialite?: string; ville?: string; page?: number; size?: number } = {}) => {
    const qs = new URLSearchParams();
    if (params.specialite) qs.set("specialite", params.specialite);
    if (params.ville) qs.set("ville", params.ville);
    qs.set("page", String(params.page ?? 1));
    qs.set("size", String(params.size ?? 20));
    return request<MedecinListItem[]>(`/api/v1/medecins?${qs.toString()}`, { auth: false });
  },

  getMedecin: (id: string) =>
    request<MedecinProfile>(`/api/v1/medecins/${id}`, { auth: false }),

  // Profil du médecin connecté
  getMyMedecin: () => request<MedecinProfile>("/api/v1/medecins/me"),

  updateMyMedecin: (payload: MedecinProfileUpdate) =>
    request<MedecinProfile>("/api/v1/medecins/me", { method: "PUT", body: payload }),

  // Créneaux libres (public) — pour les patients
  listDisponibilites: (medecinId: string) =>
    request<Disponibilite[]>(`/api/v1/medecins/${medecinId}/disponibilites?libre_only=true`, {
      auth: false,
    }),

  // Tous les créneaux d'un médecin (libres + réservés) — pour l'espace médecin
  listAllDisponibilites: (medecinId: string) =>
    request<Disponibilite[]>(`/api/v1/medecins/${medecinId}/disponibilites?libre_only=false`, {
      auth: false,
    }),

  createDisponibilite: (payload: CreateDisponibilitePayload) =>
    request<Disponibilite>("/api/v1/medecins/me/disponibilites", {
      method: "POST",
      body: payload,
    }),

  deleteDisponibilite: (slotId: string) =>
    request<void>(`/api/v1/medecins/me/disponibilites/${slotId}`, { method: "DELETE" }),

  // Rendez-vous
  createRendezVous: (payload: CreateRendezVousPayload) =>
    request<RendezVous>("/api/v1/rendez-vous", { method: "POST", body: payload }),

  listRendezVous: (params: { page?: number; size?: number; statut?: StatutRDV } = {}) => {
    const qs = new URLSearchParams();
    qs.set("page", String(params.page ?? 1));
    qs.set("size", String(params.size ?? 50));
    if (params.statut) qs.set("statut", params.statut);
    return request<PaginatedRendezVous>(`/api/v1/rendez-vous?${qs.toString()}`);
  },

  updateRendezVousStatut: (id: string, statut: StatutRDV) =>
    request<RendezVous>(`/api/v1/rendez-vous/${id}/statut`, {
      method: "PATCH",
      body: { statut },
    }),

  // Patients
  getMyPatient: () => request<PatientProfile>("/api/v1/patients/me"),

  updateMyPatient: (payload: PatientProfileUpdate) =>
    request<PatientProfile>("/api/v1/patients/me", { method: "PUT", body: payload }),

  getPatient: (id: string) => request<PatientProfile>(`/api/v1/patients/${id}`),

  listPatients: (params: { page?: number; size?: number } = {}) => {
    const qs = new URLSearchParams();
    qs.set("page", String(params.page ?? 1));
    qs.set("size", String(params.size ?? 50));
    return request<PatientProfile[]>(`/api/v1/patients?${qs.toString()}`);
  },

  // Admin — médecins
  listMedecinsAdmin: () =>
    request<MedecinAdminItem[]>("/api/v1/medecins/admin/tous"),

  createMedecin: (payload: CreateMedecinPayload) =>
    request<MedecinProfile>("/api/v1/medecins", { method: "POST", body: payload }),

  deactivateMedecin: (id: string) =>
    request<{ message: string }>(`/api/v1/medecins/${id}/desactiver`, { method: "PATCH" }),

  activateMedecin: (id: string) =>
    request<{ message: string }>(`/api/v1/medecins/${id}/activer`, { method: "PATCH" }),

  // Dossier médical
  getDossier: (patientId: string) =>
    request<DossierMedical>(`/api/v1/patients/${patientId}/dossier`),

  addDossierEntry: (patientId: string, payload: CreateEntreePayload) =>
    request<EntreeDossier>(`/api/v1/patients/${patientId}/dossier/entrees`, {
      method: "POST",
      body: payload,
    }),
};
