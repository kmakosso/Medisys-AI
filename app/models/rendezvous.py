import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Index, String, Text, func, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

# State machine: demande → confirme → termine
#                demande → annule
#                confirme → annule
TRANSITIONS: dict[str, list[str]] = {
    "demande": ["confirme", "annule"],
    "confirme": ["termine", "annule"],
    "annule": [],
    "termine": [],
}


class StatutRDV(str, enum.Enum):
    demande = "demande"
    confirme = "confirme"
    annule = "annule"
    termine = "termine"


class RendezVous(Base):
    __tablename__ = "rendez_vous"
    __table_args__ = (
        # Un seul RDV *actif* par créneau : on autorise plusieurs lignes annulées
        # (historique/audit), mais une seule non-annulée. Permet de re-réserver
        # un créneau libéré après annulation.
        Index(
            "uq_active_rdv_per_creneau",
            "creneau_id",
            unique=True,
            postgresql_where=text("statut <> 'annule'"),
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    patient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("patient_profiles.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    medecin_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("medecin_profiles.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    creneau_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("disponibilites.id", ondelete="RESTRICT"),
        nullable=False,
        # Unicité gérée par l'index partiel uq_active_rdv_per_creneau (cf. __table_args__)
    )
    motif: Mapped[str | None] = mapped_column(Text, nullable=True)
    statut: Mapped[StatutRDV] = mapped_column(
        Enum(StatutRDV), default=StatutRDV.demande, nullable=False
    )
    # v3 placeholder — paiement handled by Wave/Orange Money integration
    paiement_ref: Mapped[str | None] = mapped_column(String(100), nullable=True)
    # v3 placeholder — IA rappels
    rappel_envoye: Mapped[bool] = mapped_column(default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    patient: Mapped["PatientProfile"] = relationship(  # type: ignore[name-defined]
        "PatientProfile", back_populates="rendez_vous", foreign_keys=[patient_id]
    )
    medecin: Mapped["MedecinProfile"] = relationship(  # type: ignore[name-defined]
        "MedecinProfile", back_populates="rendez_vous", foreign_keys=[medecin_id]
    )
    creneau: Mapped["Disponibilite"] = relationship(  # type: ignore[name-defined]
        "Disponibilite", back_populates="rendezvous"
    )

    def can_transition_to(self, new_statut: StatutRDV) -> bool:
        return new_statut.value in TRANSITIONS.get(self.statut.value, [])
