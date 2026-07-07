import { apiClient } from "./axiosClient";
import type { GroupeSanguin, SanteProfil, VaccinationEntry } from "@/shared/types";

export interface SanteProfilUpdatePayload {
  groupe_sanguin?: GroupeSanguin | null;
  allergies?: string[];
  antecedents?: string[];
  maladies_chroniques?: string[];
  traitements_en_cours?: string | null;
  medecin_traitant_id?: string | null;
  contact_urgence_nom?: string | null;
  contact_urgence_prenom?: string | null;
  contact_urgence_telephone?: string | null;
}

export interface VaccinationCreatePayload {
  vaccin: string;
  date_administration: string;
  prochain_rappel?: string | null;
}

export const santeApi = {
  get: (patientId: string) =>
    apiClient.get<SanteProfil>(`/patients/${patientId}/sante-profil`).then((r) => r.data),

  update: (patientId: string, payload: SanteProfilUpdatePayload) =>
    apiClient
      .put<SanteProfil>(`/patients/${patientId}/sante-profil`, payload)
      .then((r) => r.data),

  listVaccinations: (patientId: string) =>
    apiClient
      .get<VaccinationEntry[]>(`/patients/${patientId}/sante-profil/vaccinations`)
      .then((r) => r.data),

  addVaccination: (patientId: string, payload: VaccinationCreatePayload) =>
    apiClient
      .post<VaccinationEntry>(`/patients/${patientId}/sante-profil/vaccinations`, payload)
      .then((r) => r.data),

  deleteVaccination: (patientId: string, vaccinationId: string) =>
    apiClient.delete(`/patients/${patientId}/sante-profil/vaccinations/${vaccinationId}`),
};
