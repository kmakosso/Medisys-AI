"""Tests: gestion de documents (ordonnances, résultats...) liés à un patient."""

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

FAKE_PDF = b"%PDF-1.4 fake content for tests"


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
async def test_patient_can_upload_and_list_own_document(client: AsyncClient):
    pt = await _patient_token(client, "doc.patient1@test.sn")
    hp = {"Authorization": f"Bearer {pt}"}
    pid = await _patient_id(client, pt)

    upload = await client.post(
        f"/api/v1/patients/{pid}/documents",
        headers=hp,
        data={"type_document": "resultat"},
        files={"file": ("analyse.pdf", FAKE_PDF, "application/pdf")},
    )
    assert upload.status_code == 201
    assert upload.json()["nom_fichier"] == "analyse.pdf"

    listing = await client.get(f"/api/v1/patients/{pid}/documents", headers=hp)
    assert listing.status_code == 200
    assert len(listing.json()) == 1


@pytest.mark.asyncio
async def test_download_document_returns_pdf_bytes(client: AsyncClient):
    pt = await _patient_token(client, "doc.patient2@test.sn")
    hp = {"Authorization": f"Bearer {pt}"}
    pid = await _patient_id(client, pt)

    upload = await client.post(
        f"/api/v1/patients/{pid}/documents",
        headers=hp,
        data={"type_document": "ordonnance"},
        files={"file": ("ordo.pdf", FAKE_PDF, "application/pdf")},
    )
    doc_id = upload.json()["id"]

    download = await client.get(f"/api/v1/patients/{pid}/documents/{doc_id}/download", headers=hp)
    assert download.status_code == 200
    assert download.content == FAKE_PDF
    assert download.headers["content-type"] == "application/pdf"


@pytest.mark.asyncio
async def test_medecin_without_rdv_cannot_access_documents(client: AsyncClient, db_session: AsyncSession):
    med = await _make_medecin(db_session, "doc.med1@test.sn")
    await db_session.commit()
    pt = await _patient_token(client, "doc.patient3@test.sn")
    pid = await _patient_id(client, pt)

    mt = (
        await client.post(LOGIN_URL, json={"email": "doc.med1@test.sn", "password": "Medecin1234!"})
    ).json()["access_token"]
    resp = await client.get(
        f"/api/v1/patients/{pid}/documents", headers={"Authorization": f"Bearer {mt}"}
    )
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_medecin_with_rdv_can_send_document_to_patient(
    client: AsyncClient, db_session: AsyncSession
):
    med = await _make_medecin(db_session, "doc.med2@test.sn")
    slot = await _slot(db_session, med.id, 3)
    await db_session.commit()

    pt = await _patient_token(client, "doc.patient4@test.sn")
    hp = {"Authorization": f"Bearer {pt}"}
    pid = await _patient_id(client, pt)

    book = await client.post("/api/v1/rendez-vous", json={"creneau_id": str(slot.id)}, headers=hp)
    mt = (
        await client.post(LOGIN_URL, json={"email": "doc.med2@test.sn", "password": "Medecin1234!"})
    ).json()["access_token"]
    hm = {"Authorization": f"Bearer {mt}"}
    await client.patch(
        f"/api/v1/rendez-vous/{book.json()['id']}/statut", json={"statut": "confirme"}, headers=hm
    )

    upload = await client.post(
        f"/api/v1/patients/{pid}/documents",
        headers=hm,
        data={"type_document": "compte_rendu"},
        files={"file": ("cr.pdf", FAKE_PDF, "application/pdf")},
    )
    assert upload.status_code == 201
    assert upload.json()["emetteur_nom"] == f"Dr Doc Med"

    # Le patient voit le document envoyé par le médecin
    listing = await client.get(f"/api/v1/patients/{pid}/documents", headers=hp)
    assert len(listing.json()) == 1


@pytest.mark.asyncio
async def test_non_pdf_upload_rejected(client: AsyncClient):
    pt = await _patient_token(client, "doc.patient5@test.sn")
    hp = {"Authorization": f"Bearer {pt}"}
    pid = await _patient_id(client, pt)

    upload = await client.post(
        f"/api/v1/patients/{pid}/documents",
        headers=hp,
        data={"type_document": "autre"},
        files={"file": ("image.png", b"not-a-pdf", "image/png")},
    )
    assert upload.status_code == 400
