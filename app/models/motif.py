import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class MotifConsultation(Base):
    """Motif de consultation prédéfini par un médecin (libellé + durée indicative)."""

    __tablename__ = "motifs_consultation"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    medecin_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("medecin_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    libelle: Mapped[str] = mapped_column(String(100), nullable=False)
    duree_minutes: Mapped[int] = mapped_column(Integer, default=30, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    medecin: Mapped["MedecinProfile"] = relationship(  # type: ignore[name-defined]
        "MedecinProfile", back_populates="motifs"
    )
