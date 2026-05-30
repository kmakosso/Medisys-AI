import { apiClient } from "./axiosClient";
import type { PatientProfile } from "@/shared/types";

export interface PatientUpdatePayload {
  nom?: string;
  prenom?: string;
  date_naissance?: string | null;
  sexe?: string | null;
  telephone?: string | null;
  adresse?: string | null;
  ville?: string | null;
}

export const patientsApi = {
  me: () => apiClient.get<PatientProfile>("/patients/me").then((r) => r.data),

  updateMe: (payload: PatientUpdatePayload) =>
    apiClient.put<PatientProfile>("/patients/me", payload).then((r) => r.data),

  get: (id: string) => apiClient.get<PatientProfile>(`/patients/${id}`).then((r) => r.data),

  list: () => apiClient.get<PatientProfile[]>("/patients", { params: { size: 100 } }).then((r) => r.data),
};
