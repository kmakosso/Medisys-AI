from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decrypt_field, encrypt_field
from app.models.dossier import DossierMedical, EntreeDossier
from app.models.patient import PatientProfile
from app.models.rendezvous import RendezVous, StatutRDV
from app.schemas.dossier import DossierMedicalResponse, EntreeDossierCreate, EntreeDossierResponse


async def get_or_create_dossier(db: AsyncSession, patient_id: UUID) -> DossierMedical:
    result = await db.execute(
        select(DossierMedical).where(DossierMedical.patient_id == patient_id)
    )
    dossier = result.scalar_one_or_none()
    if dossier is None:
        dossier = DossierMedical(patient_id=patient_id)
        db.add(dossier)
        await db.flush()
    return dossier


async def medecin_has_rdv_with_patient(
    db: AsyncSession, medecin_id: UUID, patient_id: UUID
) -> bool:
    """A medecin can write to a patient's dossier only if they have a shared RDV.

    Uses limit(1) + first(): there may be several matching RDVs between the same
    medecin and patient, so scalar_one_or_none() would raise MultipleResultsFound.
    """
    result = await db.execute(
        select(RendezVous.id)
        .where(
            RendezVous.medecin_id == medecin_id,
            RendezVous.patient_id == patient_id,
            RendezVous.statut.in_([StatutRDV.confirme, StatutRDV.termine]),
        )
        .limit(1)
    )
    return result.first() is not None


async def add_entree(
    db: AsyncSession,
    medecin_id: UUID,
    patient_id: UUID,
    data: EntreeDossierCreate,
) -> EntreeDossierResponse:
    if not await medecin_has_rdv_with_patient(db, medecin_id, patient_id):
        raise PermissionError(
            "Vous ne pouvez pas accéder au dossier d'un patient sans rendez-vous confirmé"
        )

    dossier = await get_or_create_dossier(db, patient_id)
    entree = EntreeDossier(
        dossier_id=dossier.id,
        medecin_id=medecin_id,
        type_entree=data.type_entree,
        contenu_chiffre=encrypt_field(data.contenu),
    )
    db.add(entree)
    await db.flush()

    return EntreeDossierResponse(
        id=entree.id,
        dossier_id=entree.dossier_id,
        medecin_id=entree.medecin_id,
        type_entree=entree.type_entree,
        contenu=data.contenu,
        date_entree=entree.date_entree,
    )


async def get_dossier_for_patient(
    db: AsyncSession, patient_id: UUID
) -> DossierMedicalResponse | None:
    result = await db.execute(
        select(DossierMedical)
        .where(DossierMedical.patient_id == patient_id)
        .options(selectinload(DossierMedical.entrees))
    )
    dossier = result.scalar_one_or_none()
    if dossier is None:
        return None

    entrees = [
        EntreeDossierResponse(
            id=e.id,
            dossier_id=e.dossier_id,
            medecin_id=e.medecin_id,
            type_entree=e.type_entree,
            contenu=decrypt_field(e.contenu_chiffre),
            date_entree=e.date_entree,
        )
        for e in dossier.entrees
    ]
    return DossierMedicalResponse(
        id=dossier.id,
        patient_id=dossier.patient_id,
        created_at=dossier.created_at,
        entrees=entrees,
    )
