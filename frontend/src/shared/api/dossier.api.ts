import { apiClient } from "./axiosClient";
import type { DossierMedical, EntreeDossier, TypeEntree } from "@/shared/types";

export const dossierApi = {
  get: (patientId: string) =>
    apiClient.get<DossierMedical>(`/patients/${patientId}/dossier`).then((r) => r.data),

  addEntree: (patientId: string, type_entree: TypeEntree, contenu: string) =>
    apiClient
      .post<EntreeDossier>(`/patients/${patientId}/dossier/entrees`, { type_entree, contenu })
      .then((r) => r.data),
};
