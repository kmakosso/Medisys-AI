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
    assert resp.status_code == 403


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
