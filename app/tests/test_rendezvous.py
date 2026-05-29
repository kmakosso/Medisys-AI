"""Tests: RDV booking — happy path, already-taken slot, patient overlap."""

import pytest
from datetime import UTC, datetime, timedelta
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.models.disponibilite import Disponibilite
from app.models.medecin import MedecinProfile
from app.models.patient import PatientProfile
from app.models.user import RoleEnum, User

REGISTER_URL = "/api/v1/auth/register"
LOGIN_URL = "/api/v1/auth/login"
RDV_URL = "/api/v1/rendez-vous"


async def _create_medecin(db: AsyncSession) -> tuple[MedecinProfile, User]:
    user = User(
        email="dr.test@medisys.sn",
        hashed_password=hash_password("Medecin1234!"),
        role=RoleEnum.medecin,
    )
    db.add(user)
    await db.flush()
    profile = MedecinProfile(
        user_id=user.id, nom="Test", prenom="Dr",
        specialite="Généraliste", ville="Dakar",
    )
    db.add(profile)
    await db.flush()
    return profile, user


async def _create_slot(
    db: AsyncSession, medecin_id, debut: datetime, fin: datetime
) -> Disponibilite:
    slot = Disponibilite(medecin_id=medecin_id, debut=debut, fin=fin)
    db.add(slot)
    await db.flush()
    return slot


async def _patient_token(client: AsyncClient, email: str = "p@test.sn") -> str:
    await client.post(
        REGISTER_URL,
        json={"email": email, "password": "Patient1234!", "nom": "P", "prenom": "P"},
    )
    resp = await client.post(LOGIN_URL, json={"email": email, "password": "Patient1234!"})
    return resp.json()["access_token"]


@pytest.mark.asyncio
async def test_book_rdv_success(client: AsyncClient, db_session: AsyncSession):
    medecin, _ = await _create_medecin(db_session)
    base = datetime.now(UTC).replace(microsecond=0) + timedelta(hours=2)
    slot = await _create_slot(db_session, medecin.id, base, base + timedelta(hours=1))
    await db_session.commit()

    token = await _patient_token(client)
    resp = await client.post(
        RDV_URL,
        json={"creneau_id": str(slot.id), "motif": "Consultation"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 201
    assert resp.json()["statut"] == "demande"


@pytest.mark.asyncio
async def test_book_rdv_already_taken(client: AsyncClient, db_session: AsyncSession):
    medecin, _ = await _create_medecin(db_session)
    base = datetime.now(UTC).replace(microsecond=0) + timedelta(hours=2)
    slot = await _create_slot(db_session, medecin.id, base, base + timedelta(hours=1))
    await db_session.commit()

    token1 = await _patient_token(client, "p1@test.sn")
    token2 = await _patient_token(client, "p2@test.sn")

    r1 = await client.post(
        RDV_URL,
        json={"creneau_id": str(slot.id)},
        headers={"Authorization": f"Bearer {token1}"},
    )
    assert r1.status_code == 201

    r2 = await client.post(
        RDV_URL,
        json={"creneau_id": str(slot.id)},
        headers={"Authorization": f"Bearer {token2}"},
    )
    assert r2.status_code == 409


@pytest.mark.asyncio
async def test_book_rdv_overlap_same_patient(client: AsyncClient, db_session: AsyncSession):
    medecin, _ = await _create_medecin(db_session)
    base = datetime.now(UTC).replace(microsecond=0) + timedelta(hours=2)

    slot1 = await _create_slot(db_session, medecin.id, base, base + timedelta(hours=1))
    # Overlapping slot (same medecin, different time — but patient already booked the overlap window)
    slot2 = await _create_slot(
        db_session, medecin.id, base + timedelta(minutes=30), base + timedelta(minutes=90)
    )
    await db_session.commit()

    token = await _patient_token(client)
    r1 = await client.post(
        RDV_URL,
        json={"creneau_id": str(slot1.id)},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r1.status_code == 201

    r2 = await client.post(
        RDV_URL,
        json={"creneau_id": str(slot2.id)},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r2.status_code == 409


@pytest.mark.asyncio
async def test_rdv_state_machine_invalid_transition(client: AsyncClient, db_session: AsyncSession):
    medecin, _ = await _create_medecin(db_session)
    base = datetime.now(UTC).replace(microsecond=0) + timedelta(hours=2)
    slot = await _create_slot(db_session, medecin.id, base, base + timedelta(hours=1))
    await db_session.commit()

    token = await _patient_token(client)
    r = await client.post(
        RDV_URL,
        json={"creneau_id": str(slot.id)},
        headers={"Authorization": f"Bearer {token}"},
    )
    rdv_id = r.json()["id"]

    # Patient tries to "terminer" — only medecin can do that, and only from "confirme"
    resp = await client.patch(
        f"{RDV_URL}/{rdv_id}/statut",
        json={"statut": "termine"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code in (403, 422)
