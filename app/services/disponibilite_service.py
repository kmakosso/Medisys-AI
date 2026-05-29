"""Génération de créneaux récurrents (style Doctolib : agenda hebdomadaire)."""

from datetime import UTC, datetime, time, timedelta
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.disponibilite import Disponibilite
from app.schemas.disponibilite import DisponibiliteRecurrenteCreate

# Garde-fou : nombre maximum de créneaux générés en une fois
MAX_SLOTS = 500


def _parse_hhmm(value: str) -> time:
    h, m = value.split(":")
    return time(int(h), int(m))


async def generate_recurring(
    db: AsyncSession, medecin_id: UUID, data: DisponibiliteRecurrenteCreate
) -> list[Disponibilite]:
    """Crée les créneaux récurrents non déjà existants. Retourne ceux créés."""
    heure_debut = _parse_hhmm(data.heure_debut)
    heure_fin = _parse_hhmm(data.heure_fin)
    step = timedelta(minutes=data.duree_minutes)

    # Débuts déjà présents pour ce médecin (pour éviter les doublons / contrainte unique)
    existing_result = await db.execute(
        select(Disponibilite.debut).where(Disponibilite.medecin_id == medecin_id)
    )
    existing = {d.replace(tzinfo=UTC) if d.tzinfo is None else d for d in existing_result.scalars()}

    created: list[Disponibilite] = []
    jour = data.date_debut
    while jour <= data.date_fin and len(created) < MAX_SLOTS:
        if jour.weekday() in data.jours_semaine:
            curseur = datetime.combine(jour, heure_debut, tzinfo=UTC)
            fin_journee = datetime.combine(jour, heure_fin, tzinfo=UTC)
            while curseur + step <= fin_journee and len(created) < MAX_SLOTS:
                debut = curseur
                fin = curseur + step
                if debut not in existing:
                    slot = Disponibilite(medecin_id=medecin_id, debut=debut, fin=fin)
                    db.add(slot)
                    created.append(slot)
                    existing.add(debut)
                curseur = fin
        jour += timedelta(days=1)

    await db.flush()
    return created
