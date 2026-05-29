from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import CurrentUser, require_role
from app.db.session import get_db
from app.models.medecin import MedecinProfile
from app.models.patient import PatientProfile
from app.models.user import RoleEnum, User
from app.schemas.dossier import DossierMedicalResponse, EntreeDossierCreate, EntreeDossierResponse
from app.services import audit_service, dossier_service

router = APIRouter(prefix="/patients", tags=["dossiers"])


@router.get("/{patient_id}/dossier", response_model=DossierMedicalResponse)
async def get_dossier(
    patient_id: UUID,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> DossierMedicalResponse:
    # Patients can only see their own dossier
    if current_user.role == RoleEnum.patient:
        patient_result = await db.execute(
            select(PatientProfile).where(PatientProfile.user_id == current_user.id)
        )
        patient = patient_result.scalar_one_or_none()
        if patient is None or patient.id != patient_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès refusé")
    elif current_user.role == RoleEnum.medecin:
        medecin_result = await db.execute(
            select(MedecinProfile).where(MedecinProfile.user_id == current_user.id)
        )
        medecin = medecin_result.scalar_one_or_none()
        if medecin is None:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès refusé")
        if not await dossier_service.medecin_has_rdv_with_patient(db, medecin.id, patient_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Vous n'avez pas de rendez-vous confirmé avec ce patient",
            )

    await audit_service.log_action(
        db, "access_dossier", user_id=current_user.id,
        resource_type="dossier", resource_id=str(patient_id)
    )
    await db.commit()

    dossier = await dossier_service.get_dossier_for_patient(db, patient_id)
    if dossier is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dossier non trouvé")
    return dossier


@router.post(
    "/{patient_id}/dossier/entrees",
    response_model=EntreeDossierResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_entree_dossier(
    patient_id: UUID,
    body: EntreeDossierCreate,
    current_user: Annotated[User, require_role(RoleEnum.medecin)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> EntreeDossierResponse:
    medecin_result = await db.execute(
        select(MedecinProfile).where(MedecinProfile.user_id == current_user.id)
    )
    medecin = medecin_result.scalar_one_or_none()
    if medecin is None:
        raise HTTPException(status_code=404, detail="Profil médecin introuvable")

    try:
        entree = await dossier_service.add_entree(db, medecin.id, patient_id, body)
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc))

    await audit_service.log_action(
        db, "add_entree_dossier", user_id=current_user.id,
        resource_type="entree_dossier", resource_id=str(patient_id)
    )
    await db.commit()
    return entree
