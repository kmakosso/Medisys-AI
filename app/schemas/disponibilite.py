from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, model_validator

from app.models.disponibilite import StatutDisponibilite


class DisponibiliteCreate(BaseModel):
    debut: datetime
    fin: datetime

    @model_validator(mode="after")
    def fin_apres_debut(self) -> "DisponibiliteCreate":
        if self.fin <= self.debut:
            raise ValueError("La fin du créneau doit être après le début")
        return self


class DisponibiliteResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: UUID
    medecin_id: UUID
    debut: datetime
    fin: datetime
    statut: StatutDisponibilite
