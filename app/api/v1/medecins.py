from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.dependencies import CurrentUser, require_role
from app.db.session import get_db
from app.models.medecin import MedecinProfile
from app.models.user import RoleEnum, User
from app.schemas.medecin import (
    MedecinAdminItem,
    MedecinCreateRequest,
    MedecinListResponse,
    MedecinProfileResponse,
    MedecinProfileUpdate,
)
from app.services import audit_service, auth_service

router = APIRouter(prefix="/medecins", tags=["medecins"])


async def _get_medecin_or_404(db: AsyncSession, medecin_id: UUID) -> MedecinProfile:
    result = await db.execute(select(MedecinProfile).where(MedecinProfile.id == medecin_id))
    m = result.scalar_one_or_none()
    if m is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Médecin introuvable")
    return m


@router.get("", response_model=list[MedecinListResponse])
async def list_medecins(
    db: Annotated[AsyncSession, Depends(get_db)],
    specialite: str | None = Query(None),
    ville: str | None = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
) -> list[MedecinListResponse]:
    # Recherche publique : seuls les médecins dont le compte est actif sont listés
    q = select(MedecinProfile).join(User, MedecinProfile.user_id == User.id).where(
        User.is_active.is_(True)
    )
    if specialite:
        q = q.where(MedecinProfile.specialite.ilike(f"%{specialite}%"))
    if ville:
        q = q.where(MedecinProfile.ville.ilike(f"%{ville}%"))
    q = q.offset((page - 1) * size).limit(size)
    result = await db.execute(q)
    return [MedecinListResponse.model_validate(m) for m in result.scalars().all()]


@router.get("/admin/tous", response_model=list[MedecinAdminItem])
async def admin_list_medecins(
    current_user: Annotated[User, require_role(RoleEnum.admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
    page: int = Query(1, ge=1),
    size: int = Query(100, ge=1, le=200),
) -> list[MedecinAdminItem]:
    """Liste admin : tous les médecins (actifs ET inactifs) avec leur statut."""
    result = await db.execute(
        select(MedecinProfile)
        .options(selectinload(MedecinProfile.user))
        .offset((page - 1) * size)
        .limit(size)
    )
    return [
        MedecinAdminItem(
            id=m.id,
            nom=m.nom,
            prenom=m.prenom,
            specialite=m.specialite,
            structure_sante=m.structure_sante,
            ville=m.ville,
            is_active=m.user.is_active,
        )
        for m in result.scalars().all()
    ]


@router.get("/me", response_model=MedecinProfileResponse)
async def get_my_profile(
    current_user: Annotated[User, require_role(RoleEnum.medecin)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> MedecinProfileResponse:
    result = await db.execute(
        select(MedecinProfile).where(MedecinProfile.user_id == current_user.id)
    )
    m = result.scalar_one_or_none()
    if m is None:
        raise HTTPException(status_code=404, detail="Profil non trouvé")
    return MedecinProfileResponse.model_validate(m)


@router.put("/me", response_model=MedecinProfileResponse)
async def update_my_profile(
    body: MedecinProfileUpdate,
    current_user: Annotated[User, require_role(RoleEnum.medecin)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> MedecinProfileResponse:
    result = await db.execute(
        select(MedecinProfile).where(MedecinProfile.user_id == current_user.id)
    )
    m = result.scalar_one_or_none()
    if m is None:
        raise HTTPException(status_code=404, detail="Profil non trouvé")
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(m, field, value)
    await audit_service.log_action(
        db, "update_medecin_profile", user_id=current_user.id,
        resource_type="medecin_profile", resource_id=str(m.id)
    )
    await db.commit()
    await db.refresh(m)
    return MedecinProfileResponse.model_validate(m)


@router.get("/{medecin_id}", response_model=MedecinProfileResponse)
async def get_medecin(
    medecin_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> MedecinProfileResponse:
    m = await _get_medecin_or_404(db, medecin_id)
    return MedecinProfileResponse.model_validate(m)


# ─── Admin-only ───────────────────────────────────────────────────────────────

@router.post("", response_model=MedecinProfileResponse, status_code=status.HTTP_201_CREATED)
async def admin_create_medecin(
    body: MedecinCreateRequest,
    current_user: Annotated[User, require_role(RoleEnum.admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> MedecinProfileResponse:
    existing = await auth_service.get_user_by_email(db, body.email)
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email déjà utilisé")

    user = await auth_service.create_user(db, body.email, body.password, RoleEnum.medecin)
    profile = MedecinProfile(
        user_id=user.id,
        nom=body.nom,
        prenom=body.prenom,
        specialite=body.specialite,
        numero_ordre=body.numero_ordre,
        structure_sante=body.structure_sante,
        telephone=body.telephone,
        ville=body.ville,
    )
    db.add(profile)
    await audit_service.log_action(
        db, "admin_create_medecin", user_id=current_user.id,
        resource_type="medecin", resource_id=str(user.id)
    )
    await db.commit()
    await db.refresh(profile)
    return MedecinProfileResponse.model_validate(profile)


@router.patch("/{medecin_id}/desactiver", response_model=dict)
async def admin_deactivate_medecin(
    medecin_id: UUID,
    current_user: Annotated[User, require_role(RoleEnum.admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    m = await _get_medecin_or_404(db, medecin_id)
    result = await db.execute(select(User).where(User.id == m.user_id))
    user = result.scalar_one_or_none()
    if user:
        user.is_active = False
    await audit_service.log_action(
        db, "admin_deactivate_medecin", user_id=current_user.id,
        resource_type="medecin", resource_id=str(medecin_id)
    )
    await db.commit()
    return {"message": "Médecin désactivé"}


@router.patch("/{medecin_id}/activer", response_model=dict)
async def admin_activate_medecin(
    medecin_id: UUID,
    current_user: Annotated[User, require_role(RoleEnum.admin)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    m = await _get_medecin_or_404(db, medecin_id)
    result = await db.execute(select(User).where(User.id == m.user_id))
    user = result.scalar_one_or_none()
    if user:
        user.is_active = True
    await audit_service.log_action(
        db, "admin_activate_medecin", user_id=current_user.id,
        resource_type="medecin", resource_id=str(medecin_id)
    )
    await db.commit()
    return {"message": "Médecin réactivé"}
