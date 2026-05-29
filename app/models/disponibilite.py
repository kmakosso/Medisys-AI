import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class StatutDisponibilite(str, enum.Enum):
    libre = "libre"
    reserve = "reserve"


class Disponibilite(Base):
    __tablename__ = "disponibilites"
    __table_args__ = (
        # A medecin cannot have two overlapping slots with the same start time
        UniqueConstraint("medecin_id", "debut", name="uq_medecin_debut"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    medecin_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("medecin_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    debut: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    fin: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    statut: Mapped[StatutDisponibilite] = mapped_column(
        Enum(StatutDisponibilite), default=StatutDisponibilite.libre, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    medecin: Mapped["MedecinProfile"] = relationship(  # type: ignore[name-defined]
        "MedecinProfile", back_populates="disponibilites"
    )
    rendezvous: Mapped["RendezVous | None"] = relationship(  # type: ignore[name-defined]
        "RendezVous", back_populates="creneau", uselist=False
    )
