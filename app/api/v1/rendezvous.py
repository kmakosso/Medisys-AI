from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import CurrentUser, require_role
from app.db.session import get_db
from app.models.medecin import MedecinProfile
from app.models.patient import PatientProfile
from app.models.rendezvous import RendezVous, StatutRDV
from app.models.user import RoleEnum, User
from app.schemas.rendezvous import (
    PaginatedRendezVous,
    RendezVousCreate,
    RendezVousReschedule,
    RendezVousResponse,
    RendezVousStatusUpdate,
)
from app.services import audit_service, notification_service, reservation_service

router = APIRouter(prefix="/rendez-vous", tags=["rendez-vous"])


async def _get_rdv_or_404(db: AsyncSession, rdv_id: UUID) -> RendezVous:
    result = await db.execute(select(RendezVous).where(RendezVous.id == rdv_id))
    rdv = result.scalar_one_or_none()
    if rdv is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rendez-vous introuvable")
    return rdv


async def _medecin_user_id(db: AsyncSession, medecin_id: UUID) -> UUID | None:
    res = await db.execute(
        select(MedecinProfile.user_id).where(MedecinProfile.id == medecin_id)
    )
    return res.scalar_one_or_none()


async def _patient_user_id(db: AsyncSession, patient_id: UUID) -> UUID | None:
    res = await db.execute(
        select(PatientProfile.user_id).where(PatientProfile.id == patient_id)
    )
    return res.scalar_one_or_none()


_STATUT_MESSAGES = {
    StatutRDV.confirme: "Votre rendez-vous a été confirmé par le médecin.",
    StatutRDV.annule: "Votre rendez-vous a été annulé.",
    StatutRDV.termine: "Votre rendez-vous a été marqué comme terminé.",
}


@router.post("", response_model=RendezVousResponse, status_code=status.HTTP_201_CREATED)
async def create_rdv(
    body: RendezVousCreate,
    current_user: Annotated[User, require_role(RoleEnum.patient)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> RendezVousResponse:
    result = await db.execute(
        select(PatientProfile).where(PatientProfile.user_id == current_user.id)
    )
    patient = result.scalar_one_or_none()
    if patient is None:
        raise HTTPException(status_code=404, detail="Profil patient introuvable")

    # Determine the medecin from the slot
    from app.models.disponibilite import Disponibilite
    slot_result = await db.execute(
        select(Disponibilite).where(Disponibilite.id == body.creneau_id)
    )
    slot = slot_result.scalar_one_or_none()
    if slot is None:
        raise HTTPException(status_code=404, detail="Créneau introuvable")

    try:
        rdv = await reservation_service.create_rendezvous(
            db, patient.id, slot.medecin_id, body
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))

    await audit_service.log_action(
        db, "create_rdv", user_id=current_user.id,
        resource_type="rendez_vous", resource_id=str(rdv.id)
    )
    # Notifie le médecin de la nouvelle demande
    med_user_id = await _medecin_user_id(db, rdv.medecin_id)
    if med_user_id:
        await notification_service.notify(
            db, med_user_id, "rdv_demande", "Nouvelle demande de rendez-vous d'un patient."
        )
    await db.commit()
    await db.refresh(rdv)
    return RendezVousResponse.model_validate(rdv)


@router.get("", response_model=PaginatedRendezVous)
async def list_rdv(
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    statut: StatutRDV | None = Query(None),
) -> PaginatedRendezVous:
    q = select(RendezVous)

    if current_user.role == RoleEnum.patient:
        patient_result = await db.execute(
            select(PatientProfile).where(PatientProfile.user_id == current_user.id)
        )
        patient = patient_result.scalar_one_or_none()
        if patient is None:
            return PaginatedRendezVous(total=0, page=page, size=size, items=[])
        q = q.where(RendezVous.patient_id == patient.id)
    elif current_user.role == RoleEnum.medecin:
        medecin_result = await db.execute(
            select(MedecinProfile).where(MedecinProfile.user_id == current_user.id)
        )
        medecin = medecin_result.scalar_one_or_none()
        if medecin is None:
            return PaginatedRendezVous(total=0, page=page, size=size, items=[])
        q = q.where(RendezVous.medecin_id == medecin.id)
    # Admin sees all

    if statut:
        q = q.where(RendezVous.statut == statut)

    count_result = await db.execute(q)
    total = len(count_result.scalars().all())

    result = await db.execute(q.offset((page - 1) * size).limit(size))
    items = [RendezVousResponse.model_validate(r) for r in result.scalars().all()]
    return PaginatedRendezVous(total=total, page=page, size=size, items=items)


@router.patch("/{rdv_id}/statut", response_model=RendezVousResponse)
async def update_rdv_statut(
    rdv_id: UUID,
    body: RendezVousStatusUpdate,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> RendezVousResponse:
    rdv = await _get_rdv_or_404(db, rdv_id)

    # Authorization: patient can only annuler their own RDV
    if current_user.role == RoleEnum.patient:
        patient_result = await db.execute(
            select(PatientProfile).where(PatientProfile.user_id == current_user.id)
        )
        patient = patient_result.scalar_one_or_none()
        if patient is None or rdv.patient_id != patient.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès refusé")
        if body.statut != StatutRDV.annule:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Un patient peut uniquement annuler son rendez-vous",
            )
    elif current_user.role == RoleEnum.medecin:
        medecin_result = await db.execute(
            select(MedecinProfile).where(MedecinProfile.user_id == current_user.id)
        )
        medecin = medecin_result.scalar_one_or_none()
        if medecin is None or rdv.medecin_id != medecin.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès refusé")

    try:
        rdv = await reservation_service.transition_rendezvous(db, rdv, body.statut)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))

    await audit_service.log_action(
        db, f"rdv_{body.statut.value}", user_id=current_user.id,
        resource_type="rendez_vous", resource_id=str(rdv_id)
    )
    # Notifie l'autre partie du changement de statut
    if current_user.role == RoleEnum.medecin:
        target = await _patient_user_id(db, rdv.patient_id)
        msg = _STATUT_MESSAGES.get(body.statut)
    else:  # patient a annulé
        target = await _medecin_user_id(db, rdv.medecin_id)
        msg = "Un patient a annulé son rendez-vous."
    if target and msg:
        await notification_service.notify(db, target, f"rdv_{body.statut.value}", msg)

    await db.commit()
    await db.refresh(rdv)
    return RendezVousResponse.model_validate(rdv)


@router.patch("/{rdv_id}/reprogrammer", response_model=RendezVousResponse)
async def reschedule_rdv(
    rdv_id: UUID,
    body: RendezVousReschedule,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> RendezVousResponse:
    rdv = await _get_rdv_or_404(db, rdv_id)

    # Autorisation : patient propriétaire ou médecin du RDV
    if current_user.role == RoleEnum.patient:
        pr = await db.execute(
            select(PatientProfile).where(PatientProfile.user_id == current_user.id)
        )
        patient = pr.scalar_one_or_none()
        if patient is None or rdv.patient_id != patient.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès refusé")
    elif current_user.role == RoleEnum.medecin:
        mr = await db.execute(
            select(MedecinProfile).where(MedecinProfile.user_id == current_user.id)
        )
        medecin = mr.scalar_one_or_none()
        if medecin is None or rdv.medecin_id != medecin.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès refusé")
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès refusé")

    try:
        rdv = await reservation_service.reschedule_rendezvous(db, rdv, body.nouveau_creneau_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))

    await audit_service.log_action(
        db, "rdv_reprogramme", user_id=current_user.id,
        resource_type="rendez_vous", resource_id=str(rdv_id)
    )
    med_user_id = await _medecin_user_id(db, rdv.medecin_id)
    if med_user_id:
        await notification_service.notify(
            db, med_user_id, "rdv_reprogramme", "Un rendez-vous a été reprogrammé (à reconfirmer)."
        )
    await db.commit()
    await db.refresh(rdv)
    return RendezVousResponse.model_validate(rdv)


@router.get("/{rdv_id}", response_model=RendezVousResponse)
async def get_rdv(
    rdv_id: UUID,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> RendezVousResponse:
    rdv = await _get_rdv_or_404(db, rdv_id)

    if current_user.role == RoleEnum.patient:
        patient_result = await db.execute(
            select(PatientProfile).where(PatientProfile.user_id == current_user.id)
        )
        patient = patient_result.scalar_one_or_none()
        if patient is None or rdv.patient_id != patient.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès refusé")
    elif current_user.role == RoleEnum.medecin:
        medecin_result = await db.execute(
            select(MedecinProfile).where(MedecinProfile.user_id == current_user.id)
        )
        medecin = medecin_result.scalar_one_or_none()
        if medecin is None or rdv.medecin_id != medecin.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès refusé")

    return RendezVousResponse.model_validate(rdv)
