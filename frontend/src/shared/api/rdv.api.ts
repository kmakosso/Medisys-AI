import { apiClient } from "./axiosClient";
import type { PaginatedRendezVous, RendezVous, StatutRDV } from "@/shared/types";

export const rdvApi = {
  list: (params: { page?: number; size?: number; statut?: StatutRDV } = {}) =>
    apiClient
      .get<PaginatedRendezVous>("/rendez-vous", { params: { size: 100, ...params } })
      .then((r) => r.data),

  create: (creneau_id: string, motif?: string) =>
    apiClient.post<RendezVous>("/rendez-vous", { creneau_id, motif }).then((r) => r.data),

  updateStatut: (id: string, statut: StatutRDV) =>
    apiClient.patch<RendezVous>(`/rendez-vous/${id}/statut`, { statut }).then((r) => r.data),

  reschedule: (id: string, nouveau_creneau_id: string) =>
    apiClient
      .patch<RendezVous>(`/rendez-vous/${id}/reprogrammer`, { nouveau_creneau_id })
      .then((r) => r.data),
};
