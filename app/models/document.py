import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, LargeBinary, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class TypeDocument(str, enum.Enum):
    ordonnance = "ordonnance"
    resultat = "resultat"
    compte_rendu = "compte_rendu"
    certificat = "certificat"
    autre = "autre"


class Document(Base):
    """Document médical (PDF) lié à un patient.

    Émetteur = médecin (envoi au patient) ou null si le patient l'a uploadé.
    Le contenu binaire est stocké en base (suffisant pour un projet mémoire ;
    en prod, on déporterait vers un object storage type S3/MinIO)."""

    __tablename__ = "documents"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("patient_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    medecin_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("medecin_profiles.id", ondelete="SET NULL"),
        nullable=True,
    )
    type_document: Mapped[TypeDocument] = mapped_column(
        Enum(TypeDocument), default=TypeDocument.autre, nullable=False
    )
    nom_fichier: Mapped[str] = mapped_column(String(255), nullable=False)
    taille_octets: Mapped[int] = mapped_column(Integer, nullable=False)
    contenu: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
