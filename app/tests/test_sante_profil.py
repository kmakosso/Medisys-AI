"""Tests: profil de santé patient (bonus C) — lecture patient/médecin/admin,
écriture réservée au patient, carnet de vaccination."""

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


async def _patient_id(client: AsyncClient, token: str) -> str:
    me = await client.get("/api/v1/patients/me", headers={"Authorization": f"Bearer {token}"})
    return me.json()["id"]


@pytest.mark.asyncio
async def test_get_creates_empty_profil_on_first_access(client: AsyncClient):
    pt = await _patient_token(client, "sante.patient1@test.sn")
    hp = {"Authorization": f"Bearer {pt}"}
    pid = await _patient_id(client, pt)

    resp = await client.get(f"/api/v1/patients/{pid}/sante-profil", headers=hp)
    assert resp.status_code == 200
    body = resp.json()
    assert body["allergies"] == []
    assert body["groupe_sanguin"] is None


@pytest.mark.asyncio
async def test_patient_can_update_own_profil(client: AsyncClient):
    pt = await _patient_token(client, "sante.patient2@test.sn")
    hp = {"Authorization": f"Bearer {pt}"}
    pid = await _patient_id(client, pt)

    resp = await client.put(
        f"/api/v1/patients/{pid}/sante-profil",
        json={
            "groupe_sanguin": "O+",
            "allergies": ["Pénicilline", "Arachides"],
            "antecedents": ["Diabète type 2"],
            "contact_urgence_nom": "Ndiaye",
            "contact_urgence_prenom": "Awa",
            "contact_urgence_telephone": "+221771112233",
        },
        headers=hp,
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["groupe_sanguin"] == "O+"
    assert body["allergies"] == ["Pénicilline", "Arachides"]

    # Persistance : nouvelle lecture renvoie les mêmes données
    resp2 = await client.get(f"/api/v1/patients/{pid}/sante-profil", headers=hp)
    assert resp2.json()["antecedents"] == ["Diabète type 2"]


@pytest.mark.asyncio
async def test_invalid_contact_phone_rejected(client: AsyncClient):
    pt = await _patient_token(client, "sante.patient3@test.sn")
    hp = {"Authorization": f"Bearer {pt}"}
    pid = await _patient_id(client, pt)

    resp = await client.put(
        f"/api/v1/patients/{pid}/sante-profil",
        json={"contact_urgence_telephone": "0612345678"},
        headers=hp,
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_other_patient_cannot_read_or_write(client: AsyncClient):
    pt1 = await _patient_token(client, "sante.owner@test.sn")
    pid1 = await _patient_id(client, pt1)
    pt2 = await _patient_token(client, "sante.intrus@test.sn")
    hp2 = {"Authorization": f"Bearer {pt2}"}

    resp_read = await client.get(f"/api/v1/patients/{pid1}/sante-profil", headers=hp2)
    assert resp_read.status_code == 403

    resp_write = await client.put(
        f"/api/v1/patients/{pid1}/sante-profil", json={"groupe_sanguin": "A+"}, headers=hp2
    )
    assert resp_write.status_code == 403


@pytest.mark.asyncio
async def test_medecin_with_rdv_can_read_not_write(client: AsyncClient, db_session: AsyncSession):
    med = await _make_medecin(db_session, "sante.med1@test.sn")
    slot = await _slot(db_session, med.id, 3)
    await db_session.commit()

    pt = await _patient_token(client, "sante.patient4@test.sn")
    hp = {"Authorization": f"Bearer {pt}"}
    pid = await _patient_id(client, pt)
    book = await client.post("/api/v1/rendez-vous", json={"creneau_id": str(slot.id)}, headers=hp)
    mt = (
        await client.post(LOGIN_URL, json={"email": "sante.med1@test.sn", "password": "Medecin1234!"})
    ).json()["access_token"]
    hm = {"Authorization": f"Bearer {mt}"}
    await client.patch(
        f"/api/v1/rendez-vous/{book.json()['id']}/statut", json={"statut": "confirme"}, headers=hm
    )

    read = await client.get(f"/api/v1/patients/{pid}/sante-profil", headers=hm)
    assert read.status_code == 200

    write = await client.put(
        f"/api/v1/patients/{pid}/sante-profil", json={"groupe_sanguin": "B+"}, headers=hm
    )
    assert write.status_code == 403


@pytest.mark.asyncio
async def test_medecin_without_rdv_cannot_read(client: AsyncClient, db_session: AsyncSession):
    med = await _make_medecin(db_session, "sante.med2@test.sn")
    await db_session.commit()
    pt = await _patient_token(client, "sante.patient5@test.sn")
    pid = await _patient_id(client, pt)
    mt = (
        await client.post(LOGIN_URL, json={"email": "sante.med2@test.sn", "password": "Medecin1234!"})
    ).json()["access_token"]
    resp = await client.get(
        f"/api/v1/patients/{pid}/sante-profil", headers={"Authorization": f"Bearer {mt}"}
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_vaccination_crud(client: AsyncClient):
    pt = await _patient_token(client, "sante.patient6@test.sn")
    hp = {"Authorization": f"Bearer {pt}"}
    pid = await _patient_id(client, pt)

    create = await client.post(
        f"/api/v1/patients/{pid}/sante-profil/vaccinations",
        json={"vaccin": "Fièvre jaune", "date_administration": "2020-01-15", "prochain_rappel": "2030-01-15"},
        headers=hp,
    )
    assert create.status_code == 201
    vacc_id = create.json()["id"]

    listing = await client.get(f"/api/v1/patients/{pid}/sante-profil/vaccinations", headers=hp)
    assert listing.status_code == 200
    assert len(listing.json()) == 1

    delete = await client.delete(
        f"/api/v1/patients/{pid}/sante-profil/vaccinations/{vacc_id}", headers=hp
    )
    assert delete.status_code == 204

    listing2 = await client.get(f"/api/v1/patients/{pid}/sante-profil/vaccinations", headers=hp)
    assert listing2.json() == []


@pytest.mark.asyncio
async def test_medecin_lat_lng_exposed_in_public_list(client: AsyncClient, db_session: AsyncSession):
    med = await _make_medecin(db_session, "sante.med3@test.sn")
    med.latitude = 14.6928
    med.longitude = -17.4467
    await db_session.commit()

    resp = await client.get("/api/v1/medecins")
    assert resp.status_code == 200
    item = next(m for m in resp.json() if m["nom"] == "Med")
    assert item["latitude"] == 14.6928
    assert item["longitude"] == -17.4467
