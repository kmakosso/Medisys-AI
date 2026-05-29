from datetime import UTC, datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.dependencies import CurrentUser, require_role
from app.db.session import get_db
from app.models.disponibilite import Disponibilite, StatutDisponibilite
from app.models.medecin import MedecinProfile
from app.models.motif import MotifConsultation
from app.models.user import RoleEnum, User
from app.schemas.medecin import (
    MedecinAdminItem,
    MedecinCreateRequest,
    MedecinListResponse,
    MedecinProfileResponse,
    MedecinProfileUpdate,
)
from app.schemas.motif import MotifCreate, MotifResponse
from app.services import audit_service, auth_service


async def _my_medecin(db: AsyncSession, user: User) -> MedecinProfile:
    result = await db.execute(
        select(MedecinProfile).where(MedecinProfile.user_id == user.id)
    )
    m = result.scalar_one_or_none()
    if m is None:
        raise HTTPException(status_code=404, detail="Profil médecin introuvable")
    return m

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
    q: str | None = Query(None, description="Recherche libre sur nom/prénom"),
    tri: str | None = Query(None, description="'dispo' pour trier par prochain créneau"),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
) -> list[MedecinListResponse]:
    # Recherche publique : seuls les médecins dont le compte est actif sont listés
    query = select(MedecinProfile).join(User, MedecinProfile.user_id == User.id).where(
        User.is_active.is_(True)
    )
    if specialite:
        query = query.where(MedecinProfile.specialite.ilike(f"%{specialite}%"))
    if ville:
        query = query.where(MedecinProfile.ville.ilike(f"%{ville}%"))
    if q:
        like = f"%{q}%"
        query = query.where(MedecinProfile.nom.ilike(like) | MedecinProfile.prenom.ilike(like))
    query = query.offset((page - 1) * size).limit(size)
    result = await db.execute(query)
    medecins = list(result.scalars().all())

    # Prochain créneau libre futur par médecin (un seul aller-retour DB)
    next_map: dict = {}
    if medecins:
        now = datetime.now(UTC)
        sub = await db.execute(
            select(Disponibilite.medecin_id, func.min(Disponibilite.debut))
            .where(
                Disponibilite.medecin_id.in_([m.id for m in medecins]),
                Disponibilite.statut == StatutDisponibilite.libre,
                Disponibilite.debut > now,
            )
            .group_by(Disponibilite.medecin_id)
        )
        next_map = {row[0]: row[1] for row in sub.all()}

    items = [
        MedecinListResponse(
            id=m.id,
            nom=m.nom,
            prenom=m.prenom,
            specialite=m.specialite,
            structure_sante=m.structure_sante,
            ville=m.ville,
            tarif_fcfa=m.tarif_fcfa,
            prochain_creneau=next_map.get(m.id),
        )
        for m in medecins
    ]

    if tri == "dispo":
        # Médecins avec dispo d'abord (par date croissante), puis ceux sans dispo
        items.sort(key=lambda x: (x.prochain_creneau is None, x.prochain_creneau or datetime.max.replace(tzinfo=UTC)))

    return items


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


# ─── Motifs de consultation ──────────────────────────────────────────────────

@router.get("/me/motifs", response_model=list[MotifResponse])
async def list_my_motifs(
    current_user: Annotated[User, require_role(RoleEnum.medecin)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[MotifResponse]:
    medecin = await _my_medecin(db, current_user)
    result = await db.execute(
        select(MotifConsultation).where(MotifConsultation.medecin_id == medecin.id)
    )
    return [MotifResponse.model_validate(x) for x in result.scalars().all()]


@router.post("/me/motifs", response_model=MotifResponse, status_code=status.HTTP_201_CREATED)
async def create_my_motif(
    body: MotifCreate,
    current_user: Annotated[User, require_role(RoleEnum.medecin)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> MotifResponse:
    medecin = await _my_medecin(db, current_user)
    motif = MotifConsultation(
        medecin_id=medecin.id, libelle=body.libelle, duree_minutes=body.duree_minutes
    )
    db.add(motif)
    await db.commit()
    await db.refresh(motif)
    return MotifResponse.model_validate(motif)


@router.delete("/me/motifs/{motif_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_my_motif(
    motif_id: UUID,
    current_user: Annotated[User, require_role(RoleEnum.medecin)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    medecin = await _my_medecin(db, current_user)
    result = await db.execute(
        select(MotifConsultation).where(
            MotifConsultation.id == motif_id, MotifConsultation.medecin_id == medecin.id
        )
    )
    motif = result.scalar_one_or_none()
    if motif is None:
        raise HTTPException(status_code=404, detail="Motif introuvable")
    await db.delete(motif)
    await db.commit()


@router.get("/{medecin_id}/motifs", response_model=list[MotifResponse])
async def list_medecin_motifs(
    medecin_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[MotifResponse]:
    """Motifs proposés par un médecin (public, pour la prise de RDV)."""
    result = await db.execute(
        select(MotifConsultation).where(MotifConsultation.medecin_id == medecin_id)
    )
    return [MotifResponse.model_validate(x) for x in result.scalars().all()]
