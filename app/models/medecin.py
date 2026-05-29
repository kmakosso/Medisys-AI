import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class MedecinProfile(Base):
    __tablename__ = "medecin_profiles"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    nom: Mapped[str] = mapped_column(String(100), nullable=False)
    prenom: Mapped[str] = mapped_column(String(100), nullable=False)
    specialite: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    numero_ordre: Mapped[str | None] = mapped_column(String(50), nullable=True)
    structure_sante: Mapped[str | None] = mapped_column(String(255), nullable=True)
    telephone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    ville: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    # Champs enrichis (style Doctolib)
    bio: Mapped[str | None] = mapped_column(Text, nullable=True)
    langues: Mapped[str | None] = mapped_column(String(255), nullable=True)  # CSV: "Français,Wolof"
    tarif_fcfa: Mapped[int | None] = mapped_column(Integer, nullable=True)
    adresse: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    user: Mapped["User"] = relationship("User", back_populates="medecin_profile")  # type: ignore[name-defined]
    disponibilites: Mapped[list["Disponibilite"]] = relationship(  # type: ignore[name-defined]
        "Disponibilite", back_populates="medecin", cascade="all, delete-orphan"
    )
    motifs: Mapped[list["MotifConsultation"]] = relationship(  # type: ignore[name-defined]
        "MotifConsultation", back_populates="medecin", cascade="all, delete-orphan"
    )
    rendez_vous: Mapped[list["RendezVous"]] = relationship(  # type: ignore[name-defined]
        "RendezVous", back_populates="medecin", foreign_keys="RendezVous.medecin_id"
    )
