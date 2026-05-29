"""Tests: dossier médical — écriture par le médecin (avec RDV), lecture patient,
et régression sur le cas 'plusieurs RDV avec le même patient'."""

from datetime import UTC, datetime, timedelta

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.models.disponibilite import Disponibilite
from app.models.medecin import MedecinProfile
from app.models.user import RoleEnum, User

LOGIN_URL = "/api/v1/auth/login"
REGISTER_URL = "/api/v1/auth/register"


async def _make_medecin(db: AsyncSession, email: str) -> MedecinProfile:
    u = User(email=email, hashed_password=hash_password("Medecin1234!"), role=RoleEnum.medecin)
    db.add(u)
    await db.flush()
    m = MedecinProfile(user_id=u.id, nom="Med", prenom="Doc", specialite="Généraliste")
    db.add(m)
    await db.flush()
    return m


async def _make_slot(db: AsyncSession, medecin_id, hours: int) -> Disponibilite:
    base = datetime.now(UTC).replace(microsecond=0) + timedelta(hours=hours)
    slot = Disponibilite(medecin_id=medecin_id, debut=base, fin=base + timedelta(hours=1))
    db.add(slot)
    await db.flush()
    return slot


async def _patient_token(client: AsyncClient, email: str) -> str:
    await client.post(
        REGISTER_URL, json={"email": email, "password": "Patient1234!", "nom": "Pat", "prenom": "Ient"}
    )
    return (
        await client.post(LOGIN_URL, json={"email": email, "password": "Patient1234!"})
    ).json()["access_token"]


@pytest.mark.asyncio
async def test_dossier_add_with_multiple_rdv_and_patient_read(
    client: AsyncClient, db_session: AsyncSession
):
    med = await _make_medecin(db_session, "med.dossier@test.sn")
    slot1 = await _make_slot(db_session, med.id, 3)
    slot2 = await _make_slot(db_session, med.id, 6)
    await db_session.commit()

    pt = await _patient_token(client, "pat.dossier@test.sn")
    hp = {"Authorization": f"Bearer {pt}"}

    # Le patient réserve DEUX créneaux avec le même médecin
    r1 = await client.post("/api/v1/rendez-vous", json={"creneau_id": str(slot1.id)}, headers=hp)
    r2 = await client.post("/api/v1/rendez-vous", json={"creneau_id": str(slot2.id)}, headers=hp)
    assert r1.status_code == 201 and r2.status_code == 201
    patient_id = r1.json()["patient_id"]

    # Le médecin confirme les deux RDV
    mt = (
        await client.post(LOGIN_URL, json={"email": "med.dossier@test.sn", "password": "Medecin1234!"})
    ).json()["access_token"]
    hm = {"Authorization": f"Bearer {mt}"}
    for r in (r1, r2):
        upd = await client.patch(
            f"/api/v1/rendez-vous/{r.json()['id']}/statut", json={"statut": "confirme"}, headers=hm
        )
        assert upd.status_code == 200

    # Régression : ajout d'une entrée alors qu'il y a PLUSIEURS RDV partagés
    add = await client.post(
        f"/api/v1/patients/{patient_id}/dossier/entrees",
        json={"type_entree": "consultation", "contenu": "Note confidentielle de consultation"},
        headers=hm,
    )
    assert add.status_code == 201

    # Le patient relit son dossier : contenu déchiffré
    dossier = await client.get(f"/api/v1/patients/{patient_id}/dossier", headers=hp)
    assert dossier.status_code == 200
    entrees = dossier.json()["entrees"]
    assert len(entrees) == 1
    assert entrees[0]["contenu"] == "Note confidentielle de consultation"


@pytest.mark.asyncio
async def test_medecin_without_rdv_cannot_write_dossier(
    client: AsyncClient, db_session: AsyncSession
):
    med = await _make_medecin(db_session, "med.norel@test.sn")
    await db_session.commit()
    # un patient existe mais sans RDV avec ce médecin
    pt = await _patient_token(client, "pat.norel@test.sn")
    me = await client.get("/api/v1/patients/me", headers={"Authorization": f"Bearer {pt}"})
    patient_id = me.json()["id"]

    mt = (
        await client.post(LOGIN_URL, json={"email": "med.norel@test.sn", "password": "Medecin1234!"})
    ).json()["access_token"]
    add = await client.post(
        f"/api/v1/patients/{patient_id}/dossier/entrees",
        json={"type_entree": "note", "contenu": "tentative"},
        headers={"Authorization": f"Bearer {mt}"},
    )
    assert add.status_code == 403
