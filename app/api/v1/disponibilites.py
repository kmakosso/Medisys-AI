from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import CurrentUser, require_role
from app.db.session import get_db
from app.models.disponibilite import Disponibilite, StatutDisponibilite
from app.models.medecin import MedecinProfile
from app.models.user import RoleEnum, User
from app.schemas.disponibilite import DisponibiliteCreate, DisponibiliteResponse
from app.services import audit_service

router = APIRouter(tags=["disponibilites"])


@router.post(
    "/medecins/me/disponibilites",
    response_model=DisponibiliteResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_disponibilite(
    body: DisponibiliteCreate,
    current_user: Annotated[User, require_role(RoleEnum.medecin)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> DisponibiliteResponse:
    result = await db.execute(
        select(MedecinProfile).where(MedecinProfile.user_id == current_user.id)
    )
    medecin = result.scalar_one_or_none()
    if medecin is None:
        raise HTTPException(status_code=404, detail="Profil médecin introuvable")

    slot = Disponibilite(medecin_id=medecin.id, debut=body.debut, fin=body.fin)
    db.add(slot)
    await audit_service.log_action(
        db, "create_disponibilite", user_id=current_user.id,
        resource_type="disponibilite", resource_id=str(slot.id)
    )
    await db.commit()
    await db.refresh(slot)
    return DisponibiliteResponse.model_validate(slot)


@router.delete("/medecins/me/disponibilites/{slot_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_disponibilite(
    slot_id: UUID,
    current_user: Annotated[User, require_role(RoleEnum.medecin)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    result_m = await db.execute(
        select(MedecinProfile).where(MedecinProfile.user_id == current_user.id)
    )
    medecin = result_m.scalar_one_or_none()
    if medecin is None:
        raise HTTPException(status_code=404, detail="Profil médecin introuvable")

    result = await db.execute(
        select(Disponibilite).where(
            Disponibilite.id == slot_id, Disponibilite.medecin_id == medecin.id
        )
    )
    slot = result.scalar_one_or_none()
    if slot is None:
        raise HTTPException(status_code=404, detail="Créneau introuvable")
    if slot.statut == StatutDisponibilite.reserve:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Impossible de supprimer un créneau déjà réservé",
        )
    await db.delete(slot)
    await audit_service.log_action(
        db, "delete_disponibilite", user_id=current_user.id,
        resource_type="disponibilite", resource_id=str(slot_id)
    )
    await db.commit()


@router.get(
    "/medecins/{medecin_id}/disponibilites",
    response_model=list[DisponibiliteResponse],
)
async def list_disponibilites(
    medecin_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    libre_only: bool = True,
) -> list[DisponibiliteResponse]:
    q = select(Disponibilite).where(Disponibilite.medecin_id == medecin_id)
    if libre_only:
        q = q.where(Disponibilite.statut == StatutDisponibilite.libre)
    result = await db.execute(q.order_by(Disponibilite.debut))
    return [DisponibiliteResponse.model_validate(s) for s in result.scalars().all()]
