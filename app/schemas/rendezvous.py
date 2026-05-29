from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.rendezvous import StatutRDV


class RendezVousCreate(BaseModel):
    creneau_id: UUID
    motif: str | None = Field(None, max_length=500)


class RendezVousStatusUpdate(BaseModel):
    statut: StatutRDV


class RendezVousReschedule(BaseModel):
    nouveau_creneau_id: UUID


class RendezVousResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: UUID
    patient_id: UUID
    medecin_id: UUID
    creneau_id: UUID
    motif: str | None
    statut: StatutRDV
    created_at: datetime
    updated_at: datetime


class PaginatedRendezVous(BaseModel):
    total: int
    page: int
    size: int
    items: list[RendezVousResponse]
