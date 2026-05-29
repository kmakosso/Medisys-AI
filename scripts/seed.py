"""
Seed script — creates a minimal dataset for dev/testing.
Run: python -m scripts.seed
Requires DATABASE_URL env var or a .env file.
"""

import asyncio
from datetime import UTC, datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import get_settings
from app.core.security import hash_password
from app.models.disponibilite import Disponibilite, StatutDisponibilite
from app.models.medecin import MedecinProfile
from app.models.patient import PatientProfile, SexeEnum
from app.models.rendezvous import RendezVous, StatutRDV
from app.models.user import RoleEnum, User

settings = get_settings()


async def seed() -> None:
    engine = create_async_engine(settings.database_url, echo=False)
    Session = async_sessionmaker(engine, expire_on_commit=False)

    async with Session() as db:
        # ── Admin ────────────────────────────────────────────────────────────
        admin = User(email="admin@medisys.sn", hashed_password=hash_password("Admin1234!"), role=RoleEnum.admin)
        db.add(admin)

        # ── Médecins ──────────────────────────────────────────────────────────
        med1_user = User(email="dr.diop@medisys.sn", hashed_password=hash_password("Medecin1234!"), role=RoleEnum.medecin)
        med2_user = User(email="dr.fall@medisys.sn", hashed_password=hash_password("Medecin1234!"), role=RoleEnum.medecin)
        db.add_all([med1_user, med2_user])
        await db.flush()

        med1 = MedecinProfile(
            user_id=med1_user.id, nom="Diop", prenom="Amadou",
            specialite="Cardiologie", numero_ordre="ORDRE-001",
            structure_sante="Hôpital Principal de Dakar", telephone="+221771234567", ville="Dakar",
        )
        med2 = MedecinProfile(
            user_id=med2_user.id, nom="Fall", prenom="Fatou",
            specialite="Pédiatrie", numero_ordre="ORDRE-002",
            structure_sante="Clinique Pasteur", telephone="+221776543210", ville="Thiès",
        )
        db.add_all([med1, med2])
        await db.flush()

        # ── Créneaux pour med1 ────────────────────────────────────────────────
        base = datetime.now(UTC).replace(minute=0, second=0, microsecond=0)
        slots_med1 = []
        for i in range(5):
            slot = Disponibilite(
                medecin_id=med1.id,
                debut=base + timedelta(days=1, hours=i * 2),
                fin=base + timedelta(days=1, hours=i * 2 + 1),
            )
            slots_med1.append(slot)
            db.add(slot)

        slots_med2 = []
        for i in range(3):
            slot = Disponibilite(
                medecin_id=med2.id,
                debut=base + timedelta(days=2, hours=i * 2),
                fin=base + timedelta(days=2, hours=i * 2 + 1),
            )
            slots_med2.append(slot)
            db.add(slot)

        await db.flush()

        # ── Patients ──────────────────────────────────────────────────────────
        p_users = []
        p_profiles = []
        patient_data = [
            ("patient1@test.sn", "Ndiaye", "Ousmane", "+221771111111"),
            ("patient2@test.sn", "Sarr", "Mariama", "+221772222222"),
            ("patient3@test.sn", "Mbaye", "Cheikh", "+221773333333"),
        ]
        for email, nom, prenom, tel in patient_data:
            u = User(email=email, hashed_password=hash_password("Patient1234!"), role=RoleEnum.patient)
            db.add(u)
            p_users.append(u)

        await db.flush()

        for u, (_, nom, prenom, tel) in zip(p_users, patient_data):
            p = PatientProfile(user_id=u.id, nom=nom, prenom=prenom, telephone=tel, ville="Dakar")
            db.add(p)
            p_profiles.append(p)

        await db.flush()

        # ── Rendez-vous ───────────────────────────────────────────────────────
        rdv1 = RendezVous(
            patient_id=p_profiles[0].id,
            medecin_id=med1.id,
            creneau_id=slots_med1[0].id,
            motif="Consultation cardiologique de routine",
            statut=StatutRDV.confirme,
        )
        slots_med1[0].statut = StatutDisponibilite.reserve

        rdv2 = RendezVous(
            patient_id=p_profiles[1].id,
            medecin_id=med2.id,
            creneau_id=slots_med2[0].id,
            motif="Suivi pédiatrique",
            statut=StatutRDV.demande,
        )
        slots_med2[0].statut = StatutDisponibilite.reserve

        db.add_all([rdv1, rdv2])
        await db.commit()

    print("[OK] Seed termine !")
    print("  admin@medisys.sn        / Admin1234!")
    print("  dr.diop@medisys.sn      / Medecin1234!")
    print("  dr.fall@medisys.sn      / Medecin1234!")
    print("  patient1@test.sn        / Patient1234!")
    print("  patient2@test.sn        / Patient1234!")
    print("  patient3@test.sn        / Patient1234!")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
