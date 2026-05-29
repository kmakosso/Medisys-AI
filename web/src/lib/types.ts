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
  tarif_fcfa?: number | null;
  prochain_creneau?: string | null;
}

export interface MedecinProfile {
  id: string;
  user_id: string;
  nom: string;
  prenom: string;
  specialite: string;
  structure_sante: string | null;
  ville: string | null;
  numero_ordre: string | null;
  telephone: string | null;
  bio: string | null;
  langues: string | null;
  tarif_fcfa: number | null;
  adresse: string | null;
}

export interface Motif {
  id: string;
  medecin_id: string;
  libelle: string;
  duree_minutes: number;
}

export interface MotifCreatePayload {
  libelle: string;
  duree_minutes: number;
}

export interface RecurringDispoPayload {
  jours_semaine: number[];
  heure_debut: string;
  heure_fin: string;
  duree_minutes: number;
  date_debut: string;
  date_fin: string;
}

export interface Notification {
  id: string;
  type: string;
  message: string;
  lu: boolean;
  created_at: string;
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

export type Sexe = "masculin" | "feminin" | "autre";

export interface PatientProfile {
  id: string;
  user_id: string;
  nom: string;
  prenom: string;
  date_naissance: string | null;
  sexe: Sexe | null;
  telephone: string | null;
  adresse: string | null;
  ville: string | null;
}

export interface CreateMedecinPayload {
  email: string;
  password: string;
  nom: string;
  prenom: string;
  specialite: string;
  numero_ordre?: string;
  structure_sante?: string;
  telephone?: string;
  ville?: string;
}

export type TypeEntree = "consultation" | "ordonnance" | "resultat" | "note";

export interface EntreeDossier {
  id: string;
  dossier_id: string;
  medecin_id: string;
  type_entree: TypeEntree;
  contenu: string;
  date_entree: string;
}

export interface DossierMedical {
  id: string;
  patient_id: string;
  created_at: string;
  entrees: EntreeDossier[];
}

export interface CreateEntreePayload {
  type_entree: TypeEntree;
  contenu: string;
}

export interface MedecinAdminItem {
  id: string;
  nom: string;
  prenom: string;
  specialite: string;
  structure_sante: string | null;
  ville: string | null;
  is_active: boolean;
}

export interface PatientProfileUpdate {
  nom?: string;
  prenom?: string;
  date_naissance?: string | null;
  sexe?: Sexe | null;
  telephone?: string | null;
  adresse?: string | null;
  ville?: string | null;
}

export interface MedecinProfileUpdate {
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
