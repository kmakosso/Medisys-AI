from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.sante import SanteProfil, VaccinationEntry
from app.schemas.sante import SanteProfilUpdate, VaccinationCreate


async def get_or_create_profil(db: AsyncSession, patient_id: UUID) -> SanteProfil:
    result = await db.execute(
        select(SanteProfil)
        .where(SanteProfil.patient_id == patient_id)
        .options(selectinload(SanteProfil.vaccinations))
    )
    profil = result.scalar_one_or_none()
    if profil is None:
        profil = SanteProfil(patient_id=patient_id)
        db.add(profil)
        await db.flush()
    return profil


async def update_profil(
    db: AsyncSession, patient_id: UUID, data: SanteProfilUpdate
) -> SanteProfil:
    profil = await get_or_create_profil(db, patient_id)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(profil, field, value)
    await db.flush()
    return profil


async def add_vaccination(
    db: AsyncSession, patient_id: UUID, data: VaccinationCreate
) -> VaccinationEntry:
    profil = await get_or_create_profil(db, patient_id)
    entry = VaccinationEntry(
        sante_profil_id=profil.id,
        vaccin=data.vaccin,
        date_administration=data.date_administration,
        prochain_rappel=data.prochain_rappel,
    )
    db.add(entry)
    await db.flush()
    return entry


async def delete_vaccination(db: AsyncSession, patient_id: UUID, vaccination_id: UUID) -> bool:
    profil = await get_or_create_profil(db, patient_id)
    result = await db.execute(
        select(VaccinationEntry).where(
            VaccinationEntry.id == vaccination_id,
            VaccinationEntry.sante_profil_id == profil.id,
        )
    )
    entry = result.scalar_one_or_none()
    if entry is None:
        return False
    await db.delete(entry)
    await db.flush()
    return True
