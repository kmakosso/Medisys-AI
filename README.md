# Medisys AI — Backend v1

Plateforme sécurisée de prise de rendez-vous médicaux en ligne et de suivi des patients, avec module IA de rappels intelligents.

**Mémoire ISI — Sénégal**

---

## Présentation

Medisys AI permet à des patients de prendre rendez-vous en ligne avec des médecins, aux médecins de gérer leurs créneaux et d'alimenter des dossiers médicaux, et à un administrateur de superviser l'ensemble. La sécurité des données de santé est l'exigence n°1 (conformité PSSI / ISO 27001).

---

## Stack technique

| Composant | Choix |
|-----------|-------|
| Langage | Python 3.12 |
| Framework | FastAPI (async) |
| ORM | SQLAlchemy 2.x déclaratif |
| Schémas | Pydantic v2 |
| Migrations | Alembic |
| Base de données | PostgreSQL 16 |
| Auth | JWT (HS256) + Argon2 |
| Chiffrement au repos | AES-GCM (cryptography) |
| Rate limiting | SlowAPI |
| Conteneurisation | Docker + docker-compose |

---

## Prérequis

- Docker & docker-compose **ou** Python 3.12 + PostgreSQL 16 local
- `pip install -e ".[dev]"` pour le mode local

---

## Installation et lancement

### Avec Docker (recommandé)

```bash
cp .env.example .env
# Éditez .env : JWT_SECRET_KEY, FIELD_ENCRYPTION_KEY, mots de passe Postgres
docker compose up --build
```

L'API est disponible sur http://localhost:8000  
Documentation OpenAPI : http://localhost:8000/docs (DEBUG=true uniquement)

### En local (sans Docker)

```bash
python -m venv .venv && source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -e ".[dev]"
cp .env.example .env  # ajustez DATABASE_URL
alembic upgrade head
uvicorn app.main:app --reload
```

### Seed (données de test)

```bash
python -m scripts.seed
```

Crée : 1 admin, 2 médecins (avec créneaux), 3 patients, 2 RDV.

---

## Variables d'environnement

| Variable | Description | Exemple |
|----------|-------------|---------|
| `DATABASE_URL` | URL asyncpg PostgreSQL | `postgresql+asyncpg://...` |
| `JWT_SECRET_KEY` | Clé de signature JWT (64 hex) | `openssl rand -hex 64` |
| `JWT_ALGORITHM` | Algorithme JWT | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Durée access token | `15` |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Durée refresh token | `7` |
| `FIELD_ENCRYPTION_KEY` | Clé chiffrement AES-GCM (Fernet) | `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"` |
| `CORS_ORIGINS` | Origins autorisées (CSV) | `https://app.medisys.sn` |
| `DEBUG` | Active `/docs` et SQL echo | `false` en prod |
| `RATE_LIMIT_LOGIN` | Limite anti-bruteforce login | `5/minute` |

---

## Endpoints principaux (`/api/v1`)

| Méthode | Endpoint | Rôle |
|---------|----------|------|
| POST | `/auth/register` | Inscription patient |
| POST | `/auth/login` | Connexion (rate-limited) |
| POST | `/auth/refresh` | Rotation du refresh token |
| GET | `/auth/me` | Profil de l'utilisateur connecté |
| GET/PUT | `/patients/me` | Profil patient (soi-même) |
| GET | `/patients` | Liste patients (admin) |
| GET | `/medecins` | Liste médecins filtrée (public) |
| POST | `/medecins` | Créer médecin (admin) |
| GET/PUT | `/medecins/me` | Profil médecin (soi-même) |
| POST | `/medecins/me/disponibilites` | Créer un créneau |
| DELETE | `/medecins/me/disponibilites/{id}` | Supprimer un créneau libre |
| GET | `/medecins/{id}/disponibilites` | Créneaux libres d'un médecin |
| POST | `/rendez-vous` | Réserver un RDV (patient) |
| GET | `/rendez-vous` | Liste des RDV (filtrée selon rôle) |
| PATCH | `/rendez-vous/{id}/statut` | Changer le statut du RDV |
| GET | `/patients/{id}/dossier` | Consulter le dossier médical |
| POST | `/patients/{id}/dossier/entrees` | Ajouter une entrée (médecin) |

---

## Tests

```bash
pytest app/tests/ -v
```

Couverture : auth (register/login/refresh/me), réservation RDV (nominal + créneau déjà pris + chevauchement), machine d'état, autorisations inter-patients.

---

## Sécurité — Mesures implémentées

### Authentification & mots de passe
- **Argon2** (argon2-cffi) pour le hachage des mots de passe — résistant aux attaques GPU (ISO 27001 A.9.4.3)
- Les mots de passe ne sont **jamais** stockés en clair ni renvoyés par l'API
- Validation de la force du mot de passe à l'inscription (min 8 car., majuscule, chiffre)

### Tokens JWT
- **Access token** : durée 15 min (configurable), signé HS256, clé en variable d'env
- **Refresh token** : durée 7 jours, stocké en base avec `jti` unique
- **Rotation** : chaque refresh révoque l'ancien token (table `refresh_tokens`)
- **Révocation** possible individuellement ou en masse (désactivation compte)

### Chiffrement au repos
- Le contenu des entrées de dossier médical est chiffré avec **AES-GCM** (256 bits) avant insertion en base
- Nonce aléatoire (12 bytes) par entrée — empêche les attaques par réutilisation
- AES-GCM fournit l'authenticité du chiffrement (détection de falsification)
- La clé est chargée depuis `FIELD_ENCRYPTION_KEY` (env) — jamais dans le code ou la DB

### Autorisation
- **RBAC** : 3 rôles (`patient`, `medecin`, `admin`) — contrôle par `require_role()`
- **Ownership** : un patient ne peut lire que ses propres données, un médecin n'accède qu'aux dossiers de ses patients ayant un RDV confirmé (ISO 27001 A.9.1)

### CORS et en-têtes de sécurité
- CORS restrictif : liste blanche configurable par env
- En-têtes HTTP : `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`, `Referrer-Policy`, `Permissions-Policy`
- `HSTS` activé en production (non-debug)

### Limitation de débit (anti-bruteforce)
- **5 requêtes/minute** sur `/auth/login` par IP (SlowAPI)
- Les tentatives échouées sont journalisées dans `AuditLog`

### Journalisation d'audit
- Table `AuditLog` immuable (INSERT uniquement) : qui, quoi, quand, IP, ressource
- Couvre : register, login (succès + échec), annulation/confirmation RDV, accès dossier, modifications admin
- Correspond à **ISO 27001 A.12.4** (journalisation et surveillance)

### Secrets et configuration
- Aucun secret dans le dépôt : tout en `.env` (ajouté au `.gitignore`)
- `.env.example` fourni avec des valeurs factices

### Validation des entrées
- Validation stricte via **Pydantic v2** : emails, numéros de téléphone Sénégal (`+221XXXXXXXXX`), dates, longueurs
- Aucune injection SQL possible grâce à SQLAlchemy (requêtes paramétrées)

### Conformité ISO 27001 / PSSI (principales mesures)

| Contrôle ISO 27001 | Mesure implémentée |
|--------------------|--------------------|
| A.9.1 — Politique de contrôle d'accès | RBAC + ownership par ressource |
| A.9.4.3 — Système de gestion des mots de passe | Argon2, politique de complexité |
| A.10.1 — Politique d'utilisation de la cryptographie | AES-GCM au repos, JWT signé en transit |
| A.12.4 — Journalisation et surveillance | Table AuditLog, logs applicatifs sans données sensibles |
| A.13.1 — Contrôles réseau | CORS restrictif, HSTS |
| A.18.1 — Respect des exigences légales | Données de santé chiffrées, accès tracé |

---

## Roadmap

### v2 — Frontend
- Application mobile Flutter (iOS + Android)
- Web React/Next.js
- Notifications push (Expo)

### v3 — IA + Paiements
- Module IA de rappels intelligents (Claude API / Anthropic SDK)
- Intégration Wave Sénégal et Orange Money
- Analyse prédictive des consultations
- Export PDF des ordonnances / dossiers

### Ultérieur
- Pentest et audit de sécurité
- Téléexpertise médecin-à-médecin
- Intégration dossier médical partagé national (DMP Sénégal)

---

## Structure du projet

```
app/
  core/          # Config, JWT, Argon2, AES-GCM
  db/            # Session AsyncPG, base déclarative
  models/        # SQLAlchemy ORM (8 modèles)
  schemas/       # Pydantic v2
  api/v1/        # Routers FastAPI
  services/      # Logique métier
  tests/         # pytest
alembic/         # Migrations
scripts/         # Seed
```
