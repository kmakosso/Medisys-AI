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
from app.schemas.sante import (
    SanteProfilResponse,
    SanteProfilUpdate,
    VaccinationCreate,
    VaccinationResponse,
)
from app.services import audit_service, reservation_service, sante_service

router = APIRouter(prefix="/patients", tags=["patients"])


async def _assert_can_read_patient_data(
    db: AsyncSession, current_user: User, patient_id: UUID, patient_profile: PatientProfile
) -> None:
    """Lecture : admin=tout, patient=ses propres données, médecin=patients avec RDV."""
    if current_user.role == RoleEnum.admin:
        return
    if current_user.role == RoleEnum.patient:
        if patient_profile.user_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès refusé")
        return
    if current_user.role == RoleEnum.medecin:
        result = await db.execute(
            select(MedecinProfile).where(MedecinProfile.user_id == current_user.id)
        )
        medecin = result.scalar_one_or_none()
        if medecin is None or not await reservation_service.medecin_has_any_rdv_with_patient(
            db, medecin.id, patient_id
        ):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès refusé")
        return
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès refusé")


def _assert_is_owner_patient(current_user: User, patient_profile: PatientProfile) -> None:
    """Écriture du profil de santé : réservée au patient propriétaire."""
    if current_user.role != RoleEnum.patient or patient_profile.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès refusé")


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


# ─── Profil de santé (bonus C) ────────────────────────────────────────────────

@router.get("/{patient_id}/sante-profil", response_model=SanteProfilResponse)
async def get_sante_profil(
    patient_id: UUID,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> SanteProfilResponse:
    patient_profile = await _get_profile_or_404(db, patient_id)
    await _assert_can_read_patient_data(db, current_user, patient_id, patient_profile)
    profil = await sante_service.get_or_create_profil(db, patient_id)
    await db.commit()
    await db.refresh(profil)
    return SanteProfilResponse.model_validate(profil)


@router.put("/{patient_id}/sante-profil", response_model=SanteProfilResponse)
async def update_sante_profil(
    patient_id: UUID,
    body: SanteProfilUpdate,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> SanteProfilResponse:
    patient_profile = await _get_profile_or_404(db, patient_id)
    _assert_is_owner_patient(current_user, patient_profile)
    profil = await sante_service.update_profil(db, patient_id, body)
    await audit_service.log_action(
        db, "update_sante_profil", user_id=current_user.id,
        resource_type="sante_profil", resource_id=str(profil.id)
    )
    await db.commit()
    await db.refresh(profil)
    return SanteProfilResponse.model_validate(profil)


@router.get("/{patient_id}/sante-profil/vaccinations", response_model=list[VaccinationResponse])
async def list_vaccinations(
    patient_id: UUID,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[VaccinationResponse]:
    patient_profile = await _get_profile_or_404(db, patient_id)
    await _assert_can_read_patient_data(db, current_user, patient_id, patient_profile)
    profil = await sante_service.get_or_create_profil(db, patient_id)
    await db.commit()
    await db.refresh(profil, attribute_names=["vaccinations"])
    return [VaccinationResponse.model_validate(v) for v in profil.vaccinations]


@router.post(
    "/{patient_id}/sante-profil/vaccinations",
    response_model=VaccinationResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_vaccination(
    patient_id: UUID,
    body: VaccinationCreate,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> VaccinationResponse:
    patient_profile = await _get_profile_or_404(db, patient_id)
    _assert_is_owner_patient(current_user, patient_profile)
    entry = await sante_service.add_vaccination(db, patient_id, body)
    await db.commit()
    await db.refresh(entry)
    return VaccinationResponse.model_validate(entry)


@router.delete(
    "/{patient_id}/sante-profil/vaccinations/{vaccination_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_vaccination(
    patient_id: UUID,
    vaccination_id: UUID,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    patient_profile = await _get_profile_or_404(db, patient_id)
    _assert_is_owner_patient(current_user, patient_profile)
    ok = await sante_service.delete_vaccination(db, patient_id, vaccination_id)
    if not ok:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vaccination introuvable")
    await db.commit()
