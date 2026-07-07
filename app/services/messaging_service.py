from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.messaging import Conversation
from app.models.rendezvous import RendezVous, StatutRDV


async def can_communicate(db: AsyncSession, patient_id: UUID, medecin_id: UUID) -> bool:
    """True si patient et médecin ont (eu) un RDV confirmé ou terminé ensemble."""
    result = await db.execute(
        select(RendezVous.id)
        .where(
            RendezVous.patient_id == patient_id,
            RendezVous.medecin_id == medecin_id,
            RendezVous.statut.in_([StatutRDV.confirme, StatutRDV.termine]),
        )
        .limit(1)
    )
    return result.first() is not None


async def get_or_create_conversation(
    db: AsyncSession, patient_id: UUID, medecin_id: UUID
) -> Conversation:
    result = await db.execute(
        select(Conversation).where(
            Conversation.patient_id == patient_id, Conversation.medecin_id == medecin_id
        )
    )
    conv = result.scalar_one_or_none()
    if conv is None:
        conv = Conversation(patient_id=patient_id, medecin_id=medecin_id)
        db.add(conv)
        await db.flush()
    return conv
