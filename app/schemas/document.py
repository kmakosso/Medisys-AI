from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from app.models.document import TypeDocument


class DocumentResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: UUID
    patient_id: UUID
    medecin_id: UUID | None
    type_document: TypeDocument
    nom_fichier: str
    taille_octets: int
    created_at: datetime
    # Nom de l'émetteur (rempli par l'endpoint)
    emetteur_nom: str | None = None
