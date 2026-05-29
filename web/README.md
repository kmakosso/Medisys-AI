# Medisys AI — Frontend web (v2)

Interface web Next.js (App Router + TypeScript + Tailwind) pour la plateforme Medisys AI.

Périmètre de cette itération : **authentification + parcours de prise de rendez-vous patient**.

## Fonctionnalités

### Patient
- Inscription / connexion (JWT access + refresh, refresh automatique sur 401)
- Page d'accueil avec recherche (spécialité + ville) et raccourcis de spécialités
- Recherche de médecins : filtres spécialité / ville / nom, **tri par disponibilité**,
  cartes avec avatar, **badge « prochain créneau »** et tarif
- Fiche médecin enrichie (bio, adresse, langues, tarif) + **créneaux groupés par jour**
  et choix du **motif de consultation**
- « Mes rendez-vous » : onglets **À venir / Passés**, **reprogrammation**, annulation
- Dossier médical (lecture seule), édition du profil
- **Cloche de notifications** in-app (confirmations, rappels, reprogrammations)

### Médecin
- Tableau des rendez-vous avec machine d'état (confirmer / terminer / annuler) + accès dossier
- Gestion des créneaux : ajout ponctuel **et génération récurrente** (jours + plage horaire)
- Gestion des **motifs de consultation** (libellé + durée)
- Édition du profil enrichi (bio, langues, tarif, adresse)

### Admin
- Création / **activation / désactivation** des médecins (avec statut)
- Liste des patients

## Prérequis

- Node.js 18+ (testé sur Node 24)
- Le backend FastAPI v1 démarré et accessible (par défaut `http://localhost:8000`)

## Installation et lancement

```bash
cd web
cp .env.local.example .env.local   # ajustez NEXT_PUBLIC_API_URL si besoin
npm install
npm run dev
```

L'application est disponible sur http://localhost:3000

> ⚠️ CORS : le backend doit autoriser l'origine du frontend. Dans le `.env` du backend,
> ajoutez `http://localhost:3000` à `CORS_ORIGINS`.

## Build de production

```bash
npm run build
npm run start
```

## Variables d'environnement

| Variable | Description | Défaut |
|----------|-------------|--------|
| `NEXT_PUBLIC_API_URL` | URL de base de l'API backend | `http://localhost:8000` |

## Structure

```
web/src/
  app/
    layout.tsx          # AuthProvider + Navbar
    page.tsx            # accueil
    login/              # connexion
    register/           # inscription patient
    medecins/           # recherche + liste
    medecins/[id]/      # fiche + créneaux + réservation
    rendez-vous/        # mes RDV + annulation
  components/Navbar.tsx
  lib/
    api.ts              # client API typé + refresh JWT
    auth.tsx            # contexte d'authentification
    types.ts            # types miroirs des schémas backend
    format.ts           # formatage dates / statuts
```

## À venir (prochaines itérations v2)

- Espace médecin (gestion des créneaux, confirmation/clôture des RDV)
- Espace admin (création de médecins, supervision)
- Consultation du dossier médical
- Internationalisation et mode hors-ligne (contexte connexion faible)
