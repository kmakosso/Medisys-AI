"""Tests: messagerie sécurisée patient ↔ médecin (accès conditionné à un RDV)."""

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


async def _slot(db: AsyncSession, medecin_id, hours: int) -> Disponibilite:
    base = datetime.now(UTC).replace(microsecond=0) + timedelta(hours=hours)
    s = Disponibilite(medecin_id=medecin_id, debut=base, fin=base + timedelta(hours=1))
    db.add(s)
    await db.flush()
    return s


async def _patient_token(client: AsyncClient, email: str) -> str:
    await client.post(
        REGISTER_URL, json={"email": email, "password": "Patient1234!", "nom": "P", "prenom": "P"}
    )
    return (
        await client.post(LOGIN_URL, json={"email": email, "password": "Patient1234!"})
    ).json()["access_token"]


@pytest.mark.asyncio
async def test_messaging_requires_confirmed_rdv(client: AsyncClient, db_session: AsyncSession):
    med = await _make_medecin(db_session, "med.msg@test.sn")
    await db_session.commit()
    pt = await _patient_token(client, "pat.msg@test.sn")

    # Sans RDV confirmé → 403
    resp = await client.post(
        "/api/v1/messages",
        json={"medecin_id": str(med.id)},
        headers={"Authorization": f"Bearer {pt}"},
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_messaging_full_flow(client: AsyncClient, db_session: AsyncSession):
    med = await _make_medecin(db_session, "med.msg2@test.sn")
    slot = await _slot(db_session, med.id, 3)
    await db_session.commit()

    pt = await _patient_token(client, "pat.msg2@test.sn")
    hp = {"Authorization": f"Bearer {pt}"}

    # RDV + confirmation par le médecin
    book = await client.post("/api/v1/rendez-vous", json={"creneau_id": str(slot.id)}, headers=hp)
    assert book.status_code == 201
    mt = (
        await client.post(LOGIN_URL, json={"email": "med.msg2@test.sn", "password": "Medecin1234!"})
    ).json()["access_token"]
    hm = {"Authorization": f"Bearer {mt}"}
    await client.patch(
        f"/api/v1/rendez-vous/{book.json()['id']}/statut", json={"statut": "confirme"}, headers=hm
    )

    # Le patient démarre une conversation (autorisé)
    conv = await client.post("/api/v1/messages", json={"medecin_id": str(med.id)}, headers=hp)
    assert conv.status_code == 201
    conv_id = conv.json()["id"]

    # Le patient envoie un message
    msg = await client.post(
        f"/api/v1/messages/{conv_id}", json={"contenu": "Bonjour docteur"}, headers=hp
    )
    assert msg.status_code == 201

    # Le médecin voit la conversation et le message
    convs = await client.get("/api/v1/messages", headers=hm)
    assert convs.status_code == 200
    assert len(convs.json()) == 1
    msgs = await client.get(f"/api/v1/messages/{conv_id}", headers=hm)
    assert msgs.status_code == 200
    assert msgs.json()[0]["contenu"] == "Bonjour docteur"


@pytest.mark.asyncio
async def test_outsider_cannot_read_conversation(client: AsyncClient, db_session: AsyncSession):
    med = await _make_medecin(db_session, "med.msg3@test.sn")
    slot = await _slot(db_session, med.id, 3)
    await db_session.commit()
    pt = await _patient_token(client, "pat.msg3@test.sn")
    hp = {"Authorization": f"Bearer {pt}"}
    book = await client.post("/api/v1/rendez-vous", json={"creneau_id": str(slot.id)}, headers=hp)
    mt = (
        await client.post(LOGIN_URL, json={"email": "med.msg3@test.sn", "password": "Medecin1234!"})
    ).json()["access_token"]
    await client.patch(
        f"/api/v1/rendez-vous/{book.json()['id']}/statut",
        json={"statut": "confirme"},
        headers={"Authorization": f"Bearer {mt}"},
    )
    conv = await client.post("/api/v1/messages", json={"medecin_id": str(med.id)}, headers=hp)
    conv_id = conv.json()["id"]

    # Un autre patient ne peut pas lire cette conversation
    intrus = await _patient_token(client, "intrus.msg@test.sn")
    resp = await client.get(
        f"/api/v1/messages/{conv_id}", headers={"Authorization": f"Bearer {intrus}"}
    )
    assert resp.status_code == 403
