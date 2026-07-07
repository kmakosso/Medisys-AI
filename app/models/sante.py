import enum
import uuid
from datetime import date, datetime

from sqlalchemy import JSON, Date, DateTime, Enum, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class GroupeSanguin(str, enum.Enum):
    a_pos = "A+"
    a_neg = "A-"
    b_pos = "B+"
    b_neg = "B-"
    ab_pos = "AB+"
    ab_neg = "AB-"
    o_pos = "O+"
    o_neg = "O-"


class SanteProfil(Base):
    """Profil de santé patient (bonus C) : données sensibles partagées
    uniquement avec les médecins ayant un RDV confirmé/terminé avec le patient
    (contrôle appliqué au niveau des endpoints, pas en base)."""

    __tablename__ = "sante_profils"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("patient_profiles.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    groupe_sanguin: Mapped[GroupeSanguin | None] = mapped_column(Enum(GroupeSanguin), nullable=True)
    # Listes de chaînes stockées en JSON (portable SQLite/Postgres, pas besoin
    # d'ARRAY Postgres-only — plus simple à tester).
    allergies: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    antecedents: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    maladies_chroniques: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    traitements_en_cours: Mapped[str | None] = mapped_column(Text, nullable=True)
    medecin_traitant_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("medecin_profiles.id", ondelete="SET NULL"), nullable=True
    )
    contact_urgence_nom: Mapped[str | None] = mapped_column(String(100), nullable=True)
    contact_urgence_prenom: Mapped[str | None] = mapped_column(String(100), nullable=True)
    contact_urgence_telephone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    vaccinations: Mapped[list["VaccinationEntry"]] = relationship(
        "VaccinationEntry", back_populates="sante_profil", cascade="all, delete-orphan"
    )


class VaccinationEntry(Base):
    __tablename__ = "vaccination_entries"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sante_profil_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("sante_profils.id", ondelete="CASCADE"), nullable=False, index=True
    )
    vaccin: Mapped[str] = mapped_column(String(100), nullable=False)
    date_administration: Mapped[date] = mapped_column(Date, nullable=False)
    prochain_rappel: Mapped[date | None] = mapped_column(Date, nullable=True)

    sante_profil: Mapped["SanteProfil"] = relationship("SanteProfil", back_populates="vaccinations")
