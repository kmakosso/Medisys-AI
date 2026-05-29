import enum
import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, Enum, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class SexeEnum(str, enum.Enum):
    masculin = "masculin"
    feminin = "feminin"
    autre = "autre"


class PatientProfile(Base):
    __tablename__ = "patient_profiles"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    nom: Mapped[str] = mapped_column(String(100), nullable=False)
    prenom: Mapped[str] = mapped_column(String(100), nullable=False)
    date_naissance: Mapped[date | None] = mapped_column(Date, nullable=True)
    sexe: Mapped[SexeEnum | None] = mapped_column(Enum(SexeEnum), nullable=True)
    telephone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    adresse: Mapped[str | None] = mapped_column(String(255), nullable=True)
    ville: Mapped[str | None] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    user: Mapped["User"] = relationship("User", back_populates="patient_profile")  # type: ignore[name-defined]
    dossier_medical: Mapped["DossierMedical | None"] = relationship(  # type: ignore[name-defined]
        "DossierMedical", back_populates="patient", uselist=False, cascade="all, delete-orphan"
    )
    rendez_vous: Mapped[list["RendezVous"]] = relationship(  # type: ignore[name-defined]
        "RendezVous", back_populates="patient", foreign_keys="RendezVous.patient_id"
    )
