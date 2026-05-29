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
from app.schemas.patient import PatientProfileCreate, PatientProfileResponse, PatientProfileUpdate
from app.services import audit_service, reservation_service

router = APIRouter(prefix="/patients", tags=["patients"])


async def _get_profile_or_404(db: AsyncSession, patient_id: UUID) -> PatientProfile:
    result = await db.execute(select(PatientProfile).where(PatientProfile.id == patient_id))
    profile = result.scalar_one_or_none()
    if profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient introuvable")
    return profile


@router.get("/me", response_model=PatientProfileResponse)
async def get_my_profile(
    current_user: Annotated[User, require_role(RoleEnum.patient)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> PatientProfileResponse:
    result = await db.execute(
        select(PatientProfile).where(PatientProfile.user_id == current_user.id)
    )
    profile = result.scalar_one_or_none()
    if profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profil non trouvé")
    return PatientProfileResponse.model_validate(profile)


@router.put("/me", response_model=PatientProfileResponse)
async def update_my_profile(
    body: PatientProfileUpdate,
    current_user: Annotated[User, require_role(RoleEnum.patient)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> PatientProfileResponse:
    result = await db.execute(
        select(PatientProfile).where(PatientProfile.user_id == current_user.id)
    )
    profile = result.scalar_one_or_none()
    if profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profil non trouvé")

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(profile, field, value)

    await audit_service.log_action(
        db, "update_patient_profile", user_id=current_user.id,
        resource_type="patient_profile", resource_id=str(profile.id)
    )
    await db.commit()
    await db.refresh(profile)
    return PatientProfileResponse.model_validate(profile)


# ─── Admin endpoints ──────────────────────────────────────────────────────────

@router.get("", response_model=list[PatientProfileResponse])
async def list_patients(
    current_user: Annotated[User, require_role(RoleEnum.admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
    page: int = 1,
    size: int = 20,
) -> list[PatientProfileResponse]:
    result = await db.execute(
        select(PatientProfile).offset((page - 1) * size).limit(size)
    )
    return [PatientProfileResponse.model_validate(p) for p in result.scalars().all()]


@router.get("/{patient_id}", response_model=PatientProfileResponse)
async def get_patient(
    patient_id: UUID,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> PatientProfileResponse:
    """Profil d'un patient.

    - admin : accès total
    - patient : uniquement son propre profil
    - médecin : uniquement les patients avec qui il a (eu) un rendez-vous
    """
    profile = await _get_profile_or_404(db, patient_id)

    if current_user.role == RoleEnum.admin:
        pass
    elif current_user.role == RoleEnum.patient:
        if profile.user_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès refusé")
    elif current_user.role == RoleEnum.medecin:
        result = await db.execute(
            select(MedecinProfile).where(MedecinProfile.user_id == current_user.id)
        )
        medecin = result.scalar_one_or_none()
        if medecin is None or not await reservation_service.medecin_has_any_rdv_with_patient(
            db, medecin.id, patient_id
        ):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès refusé")
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès refusé")

    return PatientProfileResponse.model_validate(profile)


@router.put("/{patient_id}", response_model=PatientProfileResponse)
async def admin_update_patient(
    patient_id: UUID,
    body: PatientProfileUpdate,
    current_user: Annotated[User, require_role(RoleEnum.admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> PatientProfileResponse:
    profile = await _get_profile_or_404(db, patient_id)
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(profile, field, value)
    await audit_service.log_action(
        db, "admin_update_patient", user_id=current_user.id,
        resource_type="patient_profile", resource_id=str(patient_id)
    )
    await db.commit()
    await db.refresh(profile)
    return PatientProfileResponse.model_validate(profile)
