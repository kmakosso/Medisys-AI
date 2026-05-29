from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, Field, field_validator, model_validator

from app.models.disponibilite import StatutDisponibilite


class DisponibiliteCreate(BaseModel):
    debut: datetime
    fin: datetime

    @model_validator(mode="after")
    def fin_apres_debut(self) -> "DisponibiliteCreate":
        if self.fin <= self.debut:
            raise ValueError("La fin du créneau doit être après le début")
        return self


class DisponibiliteRecurrenteCreate(BaseModel):
    """Génère des créneaux récurrents : pour chaque jour de [date_debut, date_fin]
    dont le jour de semaine est dans jours_semaine, crée des créneaux de
    duree_minutes entre heure_debut et heure_fin."""

    jours_semaine: list[int] = Field(min_length=1)  # 0 = lundi … 6 = dimanche
    heure_debut: str = Field(pattern=r"^([01]\d|2[0-3]):[0-5]\d$")  # "09:00"
    heure_fin: str = Field(pattern=r"^([01]\d|2[0-3]):[0-5]\d$")  # "17:00"
    duree_minutes: int = Field(30, ge=5, le=240)
    date_debut: date
    date_fin: date

    @field_validator("jours_semaine")
    @classmethod
    def jours_valides(cls, v: list[int]) -> list[int]:
        if any(j < 0 or j > 6 for j in v):
            raise ValueError("Les jours de semaine doivent être entre 0 (lundi) et 6 (dimanche)")
        return v

    @model_validator(mode="after")
    def coherence(self) -> "DisponibiliteRecurrenteCreate":
        if self.heure_fin <= self.heure_debut:
            raise ValueError("L'heure de fin doit être après l'heure de début")
        if self.date_fin < self.date_debut:
            raise ValueError("La date de fin doit être après la date de début")
        return self


class DisponibiliteResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: UUID
    medecin_id: UUID
    debut: datetime
    fin: datetime
    statut: StatutDisponibilite
