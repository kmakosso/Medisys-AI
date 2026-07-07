from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class MessageCreate(BaseModel):
    contenu: str = Field(min_length=1, max_length=5000)


class MessageResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: UUID
    conversation_id: UUID
    sender_user_id: UUID
    contenu: str
    lu: bool
    created_at: datetime


class ConversationCreate(BaseModel):
    """Démarre (ou récupère) une conversation avec l'autre partie.
    Le patient fournit medecin_id ; le médecin fournit patient_id."""

    medecin_id: UUID | None = None
    patient_id: UUID | None = None


class ConversationResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: UUID
    patient_id: UUID
    medecin_id: UUID
    # Métadonnées d'affichage (remplies par l'endpoint)
    interlocuteur_nom: str | None = None
    dernier_message: str | None = None
    non_lus: int = 0
    updated_at: datetime
