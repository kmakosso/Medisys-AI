"""Tests: authorization — a patient cannot see another patient's data."""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

REGISTER_URL = "/api/v1/auth/register"
LOGIN_URL = "/api/v1/auth/login"
PATIENTS_URL = "/api/v1/patients"


async def _register_and_login(client: AsyncClient, email: str) -> str:
    await client.post(
        REGISTER_URL,
        json={"email": email, "password": "Patient1234!", "nom": "A", "prenom": "B"},
    )
    resp = await client.post(LOGIN_URL, json={"email": email, "password": "Patient1234!"})
    return resp.json()["access_token"]


@pytest.mark.asyncio
async def test_patient_can_read_own_profile(client: AsyncClient):
    token = await _register_and_login(client, "me@test.sn")
    resp = await client.get(f"{PATIENTS_URL}/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert resp.json()["nom"] == "A"


@pytest.mark.asyncio
async def test_patient_cannot_list_all_patients(client: AsyncClient):
    token = await _register_and_login(client, "p@test.sn")
    resp = await client.get(PATIENTS_URL, headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_patient_cannot_access_admin_patient_endpoint(client: AsyncClient):
    token1 = await _register_and_login(client, "alice@test.sn")
    token2 = await _register_and_login(client, "bob@test.sn")

    # Get alice's profile id
    alice_me = await client.get(f"{PATIENTS_URL}/me", headers={"Authorization": f"Bearer {token1}"})
    alice_id = alice_me.json()["id"]

    # Bob tries to access alice's profile via the admin endpoint
    resp = await client.get(
        f"{PATIENTS_URL}/{alice_id}",
        headers={"Authorization": f"Bearer {token2}"},
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_unauthenticated_cannot_access_protected_endpoint(client: AsyncClient):
    resp = await client.get(f"{PATIENTS_URL}/me")
    assert resp.status_code in (401, 403)


@pytest.mark.asyncio
async def test_patient_cannot_access_medecin_create(client: AsyncClient):
    token = await _register_and_login(client, "patient@test.sn")
    resp = await client.post(
        "/api/v1/medecins",
        json={
            "email": "dr@test.sn", "password": "Medecin1234!",
            "nom": "X", "prenom": "Y", "specialite": "Généraliste",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_patient_cannot_access_dossier_of_other_patient(client: AsyncClient, db_session: AsyncSession):
    from app.core.security import hash_password
    from app.models.patient import PatientProfile
    from app.models.user import RoleEnum, User

    # Create a patient directly in DB with a known profile id
    u = User(email="victim@test.sn", hashed_password=hash_password("x"), role=RoleEnum.patient)
    db_session.add(u)
    await db_session.flush()
    p = PatientProfile(user_id=u.id, nom="V", prenom="V")
    db_session.add(p)
    await db_session.commit()

    attacker_token = await _register_and_login(client, "attacker@test.sn")
    resp = await client.get(
        f"/api/v1/patients/{p.id}/dossier",
        headers={"Authorization": f"Bearer {attacker_token}"},
    )
    assert resp.status_code == 403


async def _create_medecin_with_slot(db_session: AsyncSession, email: str):
    """Crée un médecin (mot de passe connu) + un créneau libre. Retourne (medecin, slot)."""
    from datetime import UTC, datetime, timedelta

    from app.core.security import hash_password
    from app.models.disponibilite import Disponibilite
    from app.models.medecin import MedecinProfile
    from app.models.user import RoleEnum, User

    u = User(email=email, hashed_password=hash_password("Medecin1234!"), role=RoleEnum.medecin)
    db_session.add(u)
    await db_session.flush()
    m = MedecinProfile(user_id=u.id, nom="Med", prenom="Doc", specialite="Généraliste")
    db_session.add(m)
    await db_session.flush()
    base = datetime.now(UTC).replace(microsecond=0) + timedelta(hours=3)
    slot = Disponibilite(medecin_id=m.id, debut=base, fin=base + timedelta(hours=1))
    db_session.add(slot)
    await db_session.commit()
    return m, slot


@pytest.mark.asyncio
async def test_medecin_sees_patient_identity_only_with_rdv(
    client: AsyncClient, db_session: AsyncSession
):
    # Médecin A a un créneau, le patient réserve avec lui
    med_a, slot = await _create_medecin_with_slot(db_session, "med.a@test.sn")
    med_b, _ = await _create_medecin_with_slot(db_session, "med.b@test.sn")

    patient_token = await _register_and_login(client, "pat.identity@test.sn")
    book = await client.post(
        "/api/v1/rendez-vous",
        json={"creneau_id": str(slot.id)},
        headers={"Authorization": f"Bearer {patient_token}"},
    )
    assert book.status_code == 201
    patient_id = book.json()["patient_id"]

    # Médecin A (a un RDV) peut voir l'identité du patient
    tok_a = (
        await client.post(LOGIN_URL, json={"email": "med.a@test.sn", "password": "Medecin1234!"})
    ).json()["access_token"]
    resp_a = await client.get(
        f"{PATIENTS_URL}/{patient_id}", headers={"Authorization": f"Bearer {tok_a}"}
    )
    assert resp_a.status_code == 200
    assert resp_a.json()["nom"] is not None

    # Médecin B (aucun RDV avec ce patient) ne peut pas
    tok_b = (
        await client.post(LOGIN_URL, json={"email": "med.b@test.sn", "password": "Medecin1234!"})
    ).json()["access_token"]
    resp_b = await client.get(
        f"{PATIENTS_URL}/{patient_id}", headers={"Authorization": f"Bearer {tok_b}"}
    )
    assert resp_b.status_code == 403
