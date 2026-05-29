import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class TypeEntree(str, enum.Enum):
    consultation = "consultation"
    ordonnance = "ordonnance"
    resultat = "resultat"
    note = "note"


class DossierMedical(Base):
    __tablename__ = "dossiers_medicaux"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("patient_profiles.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    patient: Mapped["PatientProfile"] = relationship(  # type: ignore[name-defined]
        "PatientProfile", back_populates="dossier_medical"
    )
    entrees: Mapped[list["EntreeDossier"]] = relationship(
        "EntreeDossier", back_populates="dossier", cascade="all, delete-orphan"
    )


class EntreeDossier(Base):
    """
    contenu_chiffre stores AES-GCM encrypted text (see app.core.security.encrypt_field).
    The encryption key lives in the FIELD_ENCRYPTION_KEY env variable — never in the DB.
    """

    __tablename__ = "entrees_dossier"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    dossier_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("dossiers_medicaux.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    medecin_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("medecin_profiles.id", ondelete="RESTRICT"),
        nullable=False,
    )
    type_entree: Mapped[TypeEntree] = mapped_column(Enum(TypeEntree), nullable=False)
    # Encrypted with AES-GCM at the application layer
    contenu_chiffre: Mapped[str] = mapped_column(Text, nullable=False)
    date_entree: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    dossier: Mapped["DossierMedical"] = relationship("DossierMedical", back_populates="entrees")
    medecin: Mapped["MedecinProfile"] = relationship("MedecinProfile")  # type: ignore[name-defined]


from app.models.medecin import MedecinProfile  # noqa: E402, F401
from app.models.patient import PatientProfile  # noqa: E402, F401
