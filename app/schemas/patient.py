import re
from datetime import date
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from app.models.patient import SexeEnum

_SENEGAL_PHONE_RE = re.compile(r"^\+221[0-9]{9}$")


class PatientProfileBase(BaseModel):
    nom: str = Field(min_length=1, max_length=100)
    prenom: str = Field(min_length=1, max_length=100)
    date_naissance: date | None = None
    sexe: SexeEnum | None = None
    telephone: str | None = None
    adresse: str | None = Field(None, max_length=255)
    ville: str | None = Field(None, max_length=100)

    @field_validator("telephone")
    @classmethod
    def validate_telephone(cls, v: str | None) -> str | None:
        if v is not None and not _SENEGAL_PHONE_RE.match(v):
            raise ValueError("Le téléphone doit être au format sénégalais (+221XXXXXXXXX)")
        return v


class PatientProfileCreate(PatientProfileBase):
    pass


class PatientProfileUpdate(BaseModel):
    nom: str | None = Field(None, min_length=1, max_length=100)
    prenom: str | None = Field(None, min_length=1, max_length=100)
    date_naissance: date | None = None
    sexe: SexeEnum | None = None
    telephone: str | None = None
    adresse: str | None = Field(None, max_length=255)
    ville: str | None = Field(None, max_length=100)

    @field_validator("telephone")
    @classmethod
    def validate_telephone(cls, v: str | None) -> str | None:
        if v is not None and not _SENEGAL_PHONE_RE.match(v):
            raise ValueError("Le téléphone doit être au format sénégalais (+221XXXXXXXXX)")
        return v


class PatientProfileResponse(PatientProfileBase):
    model_config = {"from_attributes": True}

    id: UUID
    user_id: UUID
