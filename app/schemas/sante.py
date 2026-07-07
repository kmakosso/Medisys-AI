import re
from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from app.models.sante import GroupeSanguin

_SENEGAL_PHONE_RE = re.compile(r"^\+221[0-9]{9}$")


class SanteProfilUpdate(BaseModel):
    """Tous les champs optionnels : chaque champ peut être auto-sauvegardé
    indépendamment (envoi partiel accepté)."""

    groupe_sanguin: GroupeSanguin | None = None
    allergies: list[str] | None = None
    antecedents: list[str] | None = None
    maladies_chroniques: list[str] | None = None
    traitements_en_cours: str | None = None
    medecin_traitant_id: UUID | None = None
    contact_urgence_nom: str | None = Field(None, max_length=100)
    contact_urgence_prenom: str | None = Field(None, max_length=100)
    contact_urgence_telephone: str | None = None

    @field_validator("contact_urgence_telephone")
    @classmethod
    def validate_telephone(cls, v: str | None) -> str | None:
        if v and not _SENEGAL_PHONE_RE.match(v):
            raise ValueError("Le téléphone doit être au format sénégalais (+221XXXXXXXXX)")
        return v


class SanteProfilResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: UUID
    patient_id: UUID
    groupe_sanguin: GroupeSanguin | None
    allergies: list[str]
    antecedents: list[str]
    maladies_chroniques: list[str]
    traitements_en_cours: str | None
    medecin_traitant_id: UUID | None
    contact_urgence_nom: str | None
    contact_urgence_prenom: str | None
    contact_urgence_telephone: str | None
    updated_at: datetime


class VaccinationCreate(BaseModel):
    vaccin: str = Field(min_length=1, max_length=100)
    date_administration: date
    prochain_rappel: date | None = None


class VaccinationResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: UUID
    sante_profil_id: UUID
    vaccin: str
    date_administration: date
    prochain_rappel: date | None
