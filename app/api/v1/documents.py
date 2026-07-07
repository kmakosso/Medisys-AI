from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import CurrentUser
from app.db.session import get_db
from app.models.document import Document, TypeDocument
from app.models.medecin import MedecinProfile
from app.models.patient import PatientProfile
from app.models.user import RoleEnum, User
from app.schemas.document import DocumentResponse
from app.services import reservation_service

router = APIRouter(prefix="/patients", tags=["documents"])

MAX_DOC_BYTES = 5 * 1024 * 1024  # 5 Mo


async def _patient_of(db: AsyncSession, user: User) -> PatientProfile | None:
    res = await db.execute(select(PatientProfile).where(PatientProfile.user_id == user.id))
    return res.scalar_one_or_none()


async def _medecin_of(db: AsyncSession, user: User) -> MedecinProfile | None:
    res = await db.execute(select(MedecinProfile).where(MedecinProfile.user_id == user.id))
    return res.scalar_one_or_none()


async def _assert_access(db: AsyncSession, user: User, patient_id: UUID) -> None:
    """Patient = ses docs ; médecin = patients avec qui il a un RDV ; admin = tout."""
    if user.role == RoleEnum.admin:
        return
    if user.role == RoleEnum.patient:
        p = await _patient_of(db, user)
        if not p or p.id != patient_id:
            raise HTTPException(status_code=403, detail="Accès refusé")
        return
    if user.role == RoleEnum.medecin:
        m = await _medecin_of(db, user)
        if not m or not await reservation_service.medecin_has_any_rdv_with_patient(
            db, m.id, patient_id
        ):
            raise HTTPException(status_code=403, detail="Accès refusé")
        return
    raise HTTPException(status_code=403, detail="Accès refusé")


async def _emetteur_nom(db: AsyncSession, doc: Document) -> str | None:
    if doc.medecin_id is None:
        return "Vous / patient"
    res = await db.execute(select(MedecinProfile).where(MedecinProfile.id == doc.medecin_id))
    m = res.scalar_one_or_none()
    return f"Dr {m.prenom} {m.nom}" if m else None


@router.get("/{patient_id}/documents", response_model=list[DocumentResponse])
async def list_documents(
    patient_id: UUID,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[DocumentResponse]:
    await _assert_access(db, current_user, patient_id)
    res = await db.execute(
        select(Document).where(Document.patient_id == patient_id).order_by(
            Document.created_at.desc()
        )
    )
    out: list[DocumentResponse] = []
    for doc in res.scalars().all():
        item = DocumentResponse.model_validate(doc)
        item.emetteur_nom = await _emetteur_nom(db, doc)
        out.append(item)
    return out


@router.post(
    "/{patient_id}/documents", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED
)
async def upload_document(
    patient_id: UUID,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    type_document: Annotated[TypeDocument, Form()] = TypeDocument.autre,
    file: UploadFile = File(...),
) -> DocumentResponse:
    await _assert_access(db, current_user, patient_id)

    if file.content_type not in ("application/pdf", "application/octet-stream"):
        raise HTTPException(status_code=400, detail="Seuls les fichiers PDF sont acceptés")
    contenu = await file.read()
    if len(contenu) > MAX_DOC_BYTES:
        raise HTTPException(status_code=413, detail="Fichier trop volumineux (max 5 Mo)")

    # Si c'est un médecin qui envoie, on enregistre son ID comme émetteur
    medecin_id = None
    if current_user.role == RoleEnum.medecin:
        m = await _medecin_of(db, current_user)
        medecin_id = m.id if m else None

    doc = Document(
        patient_id=patient_id,
        medecin_id=medecin_id,
        type_document=type_document,
        nom_fichier=file.filename or "document.pdf",
        taille_octets=len(contenu),
        contenu=contenu,
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)
    item = DocumentResponse.model_validate(doc)
    item.emetteur_nom = await _emetteur_nom(db, doc)
    return item


@router.get("/{patient_id}/documents/{document_id}/download")
async def download_document(
    patient_id: UUID,
    document_id: UUID,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Response:
    await _assert_access(db, current_user, patient_id)
    res = await db.execute(
        select(Document).where(Document.id == document_id, Document.patient_id == patient_id)
    )
    doc = res.scalar_one_or_none()
    if doc is None:
        raise HTTPException(status_code=404, detail="Document introuvable")
    return Response(
        content=doc.contenu,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{doc.nom_fichier}"'},
    )
