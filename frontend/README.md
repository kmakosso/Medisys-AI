# MedisysAI — Frontend (deux portails)

Application web React inspirée de Doctolib, adaptée au contexte sénégalais.
Deux portails **totalement distincts** partageant la même base de code :

| Portail | Public | URL (dev local) | Couleur | Auth |
|---------|--------|-----------------|---------|------|
| **MedisysAI** | Patients | `/`, `/login`, `/app/*` | Bleu vif `#1a73e8` | Email + mot de passe + OTP SMS* |
| **MedisysAI Pro** | Médecins / Admin | `/pro`, `/pro/login`, `/pro/*` | Bleu nuit `#0a3d6b` | Email + mot de passe + 2FA* |

\* L'OTP SMS (patient) et la 2FA (médecin) sont **simulés côté front** (le backend n'a
pas encore de service SMS). Codes démo : **123456** (patient), **654321** (Pro). À brancher
sur un vrai service en v3.

## Stack

React 18 · TypeScript · Vite · React Router v6 · TailwindCSS · Zustand ·
TanStack Query v5 · Axios · React Hook Form + Zod · Lucide · Sonner · Vitest.

## Prérequis

- Node.js 18+ (testé sur Node 24)
- Backend FastAPI démarré sur `http://localhost:8000`

## Lancement

```bash
cd frontend
cp .env.example .env        # ajustez VITE_API_URL si besoin
npm install
npm run dev                 # http://localhost:5173
```

> CORS : ajoutez l'origine du frontend à `CORS_ORIGINS` dans le `.env` du backend
> (`http://localhost:5173` en dev, `http://localhost:3000` via Docker).

## Scripts

| Commande | Rôle |
|----------|------|
| `npm run dev` | Serveur de dev (HMR) |
| `npm run build` | Type-check + build de production (`dist/`) |
| `npm run preview` | Prévisualise le build de prod |
| `npm run test` | Tests unitaires (Vitest) |
| `npm run lint` | ESLint |

## Variables d'environnement

| Variable | Description | Défaut |
|----------|-------------|--------|
| `VITE_API_URL` | URL de base de l'API backend | `http://localhost:8000` |

## Docker

```bash
# Depuis la racine du projet (compose global)
docker compose up --build frontend   # sert le build Vite via Nginx sur :3000
```

Le `Dockerfile` est multi-stage (build Vite → Nginx avec fallback SPA).

## Architecture

```
src/
  patient/   pages, components, layouts du portail patient
  pro/       pages, components, layouts du portail médecin (Pro)
  shared/    api (Axios + endpoints), hooks, stores (Zustand), types,
             utils, ui (composants), components (guards, NotificationBell), mocks
```

### Sécurité front
- Access token **en mémoire** (Zustand), jamais en localStorage.
- Refresh token persistant (compromis local ; httpOnly cookie recommandé en prod).
- Intercepteur Axios : refresh automatique sur 401 + rejeu de la requête.
- Gardes de routes par rôle (`PatientRoute` / `ProRoute`).
- Auto-déconnexion sur inactivité : 15 min (médecin), 30 min (patient).

## Comptes de démonstration (seed backend)

| Rôle | Email | Mot de passe |
|------|-------|--------------|
| Patient | `patient1@test.sn` | `Patient1234!` |
| Médecin | `dr.diop@medisys.sn` | `Medecin1234!` |
| Admin | `admin@medisys.sn` | `Admin1234!` |

## État / à faire
- Brancher OTP/2FA sur un vrai service SMS (v3).
- Agenda Pro : vue semaine custom (peut être remplacée par `@fullcalendar/react`).
- Upload de photos de profil, avis/notes médecins.
