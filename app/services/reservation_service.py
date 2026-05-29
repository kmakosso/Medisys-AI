"""
Reservation service — handles the critical booking flow.
Concurrency strategy:
  - The UNIQUE constraint on rendezvous.creneau_id prevents double-booking at DB level.
  - We SELECT FOR UPDATE the Disponibilite row inside a transaction so concurrent
    requests block rather than both seeing 'libre' and racing.
  - Overlapping patient slots are checked before inserting.
"""

from uuid import UUID

from sqlalchemy import and_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.disponibilite import Disponibilite, StatutDisponibilite
from app.models.rendezvous import RendezVous, StatutRDV
from app.schemas.rendezvous import RendezVousCreate


async def get_disponibilite(db: AsyncSession, slot_id: UUID) -> Disponibilite | None:
    result = await db.execute(
        select(Disponibilite)
        .where(Disponibilite.id == slot_id)
        .with_for_update()  # Pessimistic lock
    )
    return result.scalar_one_or_none()


async def check_patient_overlap(
    db: AsyncSession, patient_id: UUID, debut: "datetime", fin: "datetime", exclude_rdv_id: UUID | None = None  # type: ignore[name-defined]
) -> bool:
    """Returns True if the patient already has a confirmed/pending RDV that overlaps."""
    from datetime import datetime  # local import to keep top-level clean

    q = (
        select(RendezVous)
        .join(Disponibilite, RendezVous.creneau_id == Disponibilite.id)
        .where(
            RendezVous.patient_id == patient_id,
            RendezVous.statut.in_([StatutRDV.demande, StatutRDV.confirme]),
            Disponibilite.debut < fin,
            Disponibilite.fin > debut,
        )
    )
    if exclude_rdv_id:
        q = q.where(RendezVous.id != exclude_rdv_id)
    result = await db.execute(q)
    return result.scalar_one_or_none() is not None


async def medecin_has_any_rdv_with_patient(
    db: AsyncSession, medecin_id: UUID, patient_id: UUID
) -> bool:
    """True si le médecin a au moins un RDV (tout statut) avec ce patient.

    Utilisé pour autoriser le médecin à voir l'identité du patient — y compris
    pour un RDV encore en 'demande' (avant confirmation). L'accès au dossier
    médical reste plus restrictif (voir dossier_service: confirme/termine).
    """
    result = await db.execute(
        select(RendezVous.id)
        .where(RendezVous.medecin_id == medecin_id, RendezVous.patient_id == patient_id)
        .limit(1)
    )
    return result.scalar_one_or_none() is not None


async def create_rendezvous(
    db: AsyncSession,
    patient_id: UUID,
    medecin_id: UUID,
    data: RendezVousCreate,
) -> RendezVous:
    slot = await get_disponibilite(db, data.creneau_id)
    if slot is None:
        raise ValueError("Créneau introuvable")
    if slot.statut != StatutDisponibilite.libre:
        raise ValueError("Ce créneau est déjà réservé")
    if slot.medecin_id != medecin_id:  # type: ignore[comparison-overlap]
        raise ValueError("Créneau non associé à ce médecin")

    overlap = await check_patient_overlap(db, patient_id, slot.debut, slot.fin)
    if overlap:
        raise ValueError("Vous avez déjà un rendez-vous sur ce créneau horaire")

    rdv = RendezVous(
        patient_id=patient_id,
        medecin_id=medecin_id,
        creneau_id=slot.id,
        motif=data.motif,
        statut=StatutRDV.demande,
    )
    slot.statut = StatutDisponibilite.reserve
    db.add(rdv)

    try:
        await db.flush()
    except IntegrityError:
        await db.rollback()
        raise ValueError("Ce créneau vient d'être réservé par quelqu'un d'autre")

    return rdv


async def transition_rendezvous(
    db: AsyncSession, rdv: RendezVous, new_statut: StatutRDV
) -> RendezVous:
    if not rdv.can_transition_to(new_statut):
        raise ValueError(
            f"Transition invalide : {rdv.statut.value} → {new_statut.value}"
        )
    rdv.statut = new_statut

    # Free the slot if the RDV is cancelled
    if new_statut == StatutRDV.annule:
        result = await db.execute(
            select(Disponibilite).where(Disponibilite.id == rdv.creneau_id)
        )
        slot = result.scalar_one_or_none()
        if slot:
            slot.statut = StatutDisponibilite.libre

    await db.flush()
    return rdv
