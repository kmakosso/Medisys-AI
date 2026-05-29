from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.dossier import TypeEntree


class EntreeDossierCreate(BaseModel):
    type_entree: TypeEntree
    contenu: str = Field(min_length=1, max_length=10_000)


class EntreeDossierResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: UUID
    dossier_id: UUID
    medecin_id: UUID
    type_entree: TypeEntree
    # contenu is decrypted before returning
    contenu: str
    date_entree: datetime


class DossierMedicalResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: UUID
    patient_id: UUID
    created_at: datetime
    entrees: list[EntreeDossierResponse]
