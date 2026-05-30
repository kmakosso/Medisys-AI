import { apiClient } from "./axiosClient";
import type {
  Disponibilite,
  MedecinAdminItem,
  MedecinListItem,
  MedecinProfile,
  Motif,
} from "@/shared/types";

export interface MedecinSearchParams {
  specialite?: string;
  ville?: string;
  q?: string;
  tri?: "dispo";
  page?: number;
  size?: number;
}

export interface MedecinUpdatePayload {
  nom?: string;
  prenom?: string;
  specialite?: string;
  numero_ordre?: string | null;
  structure_sante?: string | null;
  telephone?: string | null;
  ville?: string | null;
  bio?: string | null;
  langues?: string | null;
  tarif_fcfa?: number | null;
  adresse?: string | null;
}

export const medecinsApi = {
  search: (params: MedecinSearchParams = {}) =>
    apiClient.get<MedecinListItem[]>("/medecins", { params }).then((r) => r.data),

  get: (id: string) => apiClient.get<MedecinProfile>(`/medecins/${id}`).then((r) => r.data),

  me: () => apiClient.get<MedecinProfile>("/medecins/me").then((r) => r.data),

  updateMe: (payload: MedecinUpdatePayload) =>
    apiClient.put<MedecinProfile>("/medecins/me", payload).then((r) => r.data),

  // Disponibilités
  disponibilites: (medecinId: string, libreOnly = true) =>
    apiClient
      .get<Disponibilite[]>(`/medecins/${medecinId}/disponibilites`, {
        params: { libre_only: libreOnly },
      })
      .then((r) => r.data),

  createDisponibilite: (debut: string, fin: string) =>
    apiClient
      .post<Disponibilite>("/medecins/me/disponibilites", { debut, fin })
      .then((r) => r.data),

  createRecurringDisponibilites: (payload: {
    jours_semaine: number[];
    heure_debut: string;
    heure_fin: string;
    duree_minutes: number;
    date_debut: string;
    date_fin: string;
  }) =>
    apiClient
      .post<Disponibilite[]>("/medecins/me/disponibilites/recurrentes", payload)
      .then((r) => r.data),

  deleteDisponibilite: (slotId: string) =>
    apiClient.delete(`/medecins/me/disponibilites/${slotId}`),

  // Motifs
  motifs: (medecinId: string) =>
    apiClient.get<Motif[]>(`/medecins/${medecinId}/motifs`).then((r) => r.data),

  myMotifs: () => apiClient.get<Motif[]>("/medecins/me/motifs").then((r) => r.data),

  createMotif: (libelle: string, duree_minutes: number) =>
    apiClient.post<Motif>("/medecins/me/motifs", { libelle, duree_minutes }).then((r) => r.data),

  deleteMotif: (id: string) => apiClient.delete(`/medecins/me/motifs/${id}`),

  // Admin
  adminList: () => apiClient.get<MedecinAdminItem[]>("/medecins/admin/tous").then((r) => r.data),
  create: (payload: MedecinUpdatePayload & { email: string; password: string }) =>
    apiClient.post<MedecinProfile>("/medecins", payload).then((r) => r.data),
  activate: (id: string) => apiClient.patch(`/medecins/${id}/activer`),
  deactivate: (id: string) => apiClient.patch(`/medecins/${id}/desactiver`),
};
