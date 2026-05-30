/**
 * Données fictives sénégalaises pour développer l'UI sans backend.
 * Remplacées par les appels React Query une fois l'API branchée.
 */
import type { Disponibilite, MedecinListItem, PatientProfile, RendezVous } from "@/shared/types";

export const MOCK_MEDECINS: MedecinListItem[] = [
  {
    id: "m1",
    prenom: "Moussa",
    nom: "Diallo",
    specialite: "Cardiologie",
    structure_sante: "Clinique du Cap",
    ville: "Dakar",
    tarif_fcfa: 20000,
    prochain_creneau: new Date(Date.now() + 86400000).toISOString(),
  },
  {
    id: "m2",
    prenom: "Fatou",
    nom: "Ndiaye",
    specialite: "Médecine générale",
    structure_sante: "Cabinet Médical de Thiès",
    ville: "Thiès",
    tarif_fcfa: 10000,
    prochain_creneau: new Date(Date.now() + 3600000 * 5).toISOString(),
  },
  {
    id: "m3",
    prenom: "Awa",
    nom: "Sow",
    specialite: "Dermatologie",
    structure_sante: "Clinique du Plateau",
    ville: "Dakar",
    tarif_fcfa: 15000,
    prochain_creneau: new Date(Date.now() + 86400000 * 2).toISOString(),
  },
  {
    id: "m4",
    prenom: "Cheikh",
    nom: "Ba",
    specialite: "Pédiatrie",
    structure_sante: "Hôpital de Saint-Louis",
    ville: "Saint-Louis",
    tarif_fcfa: 12000,
    prochain_creneau: null,
  },
  {
    id: "m5",
    prenom: "Mariama",
    nom: "Faye",
    specialite: "Gynécologie",
    structure_sante: "Centre de santé de Ziguinchor",
    ville: "Ziguinchor",
    tarif_fcfa: 18000,
    prochain_creneau: new Date(Date.now() + 86400000 * 3).toISOString(),
  },
];

export const MOCK_PATIENTS: PatientProfile[] = [
  {
    id: "p1",
    user_id: "u1",
    prenom: "Ousmane",
    nom: "Ndiaye",
    date_naissance: "1990-04-12",
    sexe: "masculin",
    telephone: "+221771111111",
    adresse: "Médina, Dakar",
    ville: "Dakar",
  },
  {
    id: "p2",
    user_id: "u2",
    prenom: "Mariama",
    nom: "Sarr",
    date_naissance: "1985-09-30",
    sexe: "feminin",
    telephone: "+221772222222",
    adresse: "Grand Yoff, Dakar",
    ville: "Dakar",
  },
  {
    id: "p3",
    user_id: "u3",
    prenom: "Cheikh",
    nom: "Mbaye",
    date_naissance: "2000-01-15",
    sexe: "masculin",
    telephone: "+221773333333",
    adresse: "Thiès Nord",
    ville: "Thiès",
  },
];

export const MOCK_CRENEAUX: Disponibilite[] = [
  {
    id: "c1",
    medecin_id: "m1",
    debut: new Date(Date.now() + 86400000).toISOString(),
    fin: new Date(Date.now() + 86400000 + 1800000).toISOString(),
    statut: "libre",
  },
  {
    id: "c2",
    medecin_id: "m1",
    debut: new Date(Date.now() + 86400000 + 1800000).toISOString(),
    fin: new Date(Date.now() + 86400000 + 3600000).toISOString(),
    statut: "libre",
  },
];

export const MOCK_RDV: RendezVous[] = [
  {
    id: "r1",
    patient_id: "p1",
    medecin_id: "m1",
    creneau_id: "c1",
    motif: "Consultation de suivi",
    statut: "confirme",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];
