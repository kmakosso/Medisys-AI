import re
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator

_SENEGAL_PHONE_RE = re.compile(r"^\+221[0-9]{9}$")


class MedecinProfileBase(BaseModel):
    nom: str = Field(min_length=1, max_length=100)
    prenom: str = Field(min_length=1, max_length=100)
    specialite: str = Field(min_length=1, max_length=100)
    numero_ordre: str | None = Field(None, max_length=50)
    structure_sante: str | None = Field(None, max_length=255)
    telephone: str | None = None
    ville: str | None = Field(None, max_length=100)
    bio: str | None = None
    langues: str | None = Field(None, max_length=255)
    tarif_fcfa: int | None = Field(None, ge=0)
    adresse: str | None = Field(None, max_length=255)
    latitude: float | None = Field(None, ge=-90, le=90)
    longitude: float | None = Field(None, ge=-180, le=180)

    @field_validator("telephone")
    @classmethod
    def validate_telephone(cls, v: str | None) -> str | None:
        if v is not None and not _SENEGAL_PHONE_RE.match(v):
            raise ValueError("Le téléphone doit être au format sénégalais (+221XXXXXXXXX)")
        return v


class MedecinCreateRequest(BaseModel):
    """Admin creates a medecin account + profile in one step."""

    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    nom: str = Field(min_length=1, max_length=100)
    prenom: str = Field(min_length=1, max_length=100)
    specialite: str = Field(min_length=1, max_length=100)
    numero_ordre: str | None = Field(None, max_length=50)
    structure_sante: str | None = Field(None, max_length=255)
    telephone: str | None = None
    ville: str | None = Field(None, max_length=100)

    @field_validator("telephone")
    @classmethod
    def validate_telephone(cls, v: str | None) -> str | None:
        if v is not None and not _SENEGAL_PHONE_RE.match(v):
            raise ValueError("Le téléphone doit être au format sénégalais (+221XXXXXXXXX)")
        return v


class MedecinProfileUpdate(BaseModel):
    nom: str | None = Field(None, min_length=1, max_length=100)
    prenom: str | None = Field(None, min_length=1, max_length=100)
    specialite: str | None = Field(None, min_length=1, max_length=100)
    numero_ordre: str | None = Field(None, max_length=50)
    structure_sante: str | None = Field(None, max_length=255)
    telephone: str | None = None
    ville: str | None = Field(None, max_length=100)
    bio: str | None = None
    langues: str | None = Field(None, max_length=255)
    tarif_fcfa: int | None = Field(None, ge=0)
    adresse: str | None = Field(None, max_length=255)
    latitude: float | None = Field(None, ge=-90, le=90)
    longitude: float | None = Field(None, ge=-180, le=180)

    @field_validator("telephone")
    @classmethod
    def validate_telephone(cls, v: str | None) -> str | None:
        if v is not None and not _SENEGAL_PHONE_RE.match(v):
            raise ValueError("Le téléphone doit être au format sénégalais (+221XXXXXXXXX)")
        return v


class MedecinProfileResponse(MedecinProfileBase):
    model_config = {"from_attributes": True}

    id: UUID
    user_id: UUID


class MedecinListResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: UUID
    nom: str
    prenom: str
    specialite: str
    structure_sante: str | None
    ville: str | None
    tarif_fcfa: int | None = None
    latitude: float | None = None
    longitude: float | None = None
    # Prochain créneau libre (calculé), pour le tri / badge de disponibilité
    prochain_creneau: datetime | None = None


class MedecinAdminItem(BaseModel):
    """Vue admin : inclut le statut actif/inactif (lu depuis le compte User)."""

    id: UUID
    nom: str
    prenom: str
    specialite: str
    structure_sante: str | None
    ville: str | None
    is_active: bool
