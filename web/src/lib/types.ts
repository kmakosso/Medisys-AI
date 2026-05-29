// Types miroirs des schémas Pydantic du backend (app/schemas).

export type Role = "patient" | "medecin" | "admin";

export type StatutRDV = "demande" | "confirme" | "annule" | "termine";

export type StatutDisponibilite = "libre" | "reserve";

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface User {
  id: string;
  email: string;
  role: Role;
  is_active: boolean;
}

export interface RegisterPayload {
  email: string;
  password: string;
  nom: string;
  prenom: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface MedecinListItem {
  id: string;
  nom: string;
  prenom: string;
  specialite: string;
  structure_sante: string | null;
  ville: string | null;
}

export interface MedecinProfile extends MedecinListItem {
  user_id: string;
  numero_ordre: string | null;
  telephone: string | null;
}

export interface Disponibilite {
  id: string;
  medecin_id: string;
  debut: string; // ISO datetime
  fin: string;
  statut: StatutDisponibilite;
}

export interface RendezVous {
  id: string;
  patient_id: string;
  medecin_id: string;
  creneau_id: string;
  motif: string | null;
  statut: StatutRDV;
  created_at: string;
  updated_at: string;
}

export interface PaginatedRendezVous {
  total: number;
  page: number;
  size: number;
  items: RendezVous[];
}

export interface CreateRendezVousPayload {
  creneau_id: string;
  motif?: string;
}

export interface CreateDisponibilitePayload {
  debut: string; // ISO datetime
  fin: string;
}
