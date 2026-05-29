from uuid import UUID

from pydantic import BaseModel, Field


class MotifCreate(BaseModel):
    libelle: str = Field(min_length=1, max_length=100)
    duree_minutes: int = Field(30, ge=5, le=240)


class MotifResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: UUID
    medecin_id: UUID
    libelle: str
    duree_minutes: int
