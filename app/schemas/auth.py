import re
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.models.user import RoleEnum

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    nom: str = Field(min_length=1, max_length=100)
    prenom: str = Field(min_length=1, max_length=100)

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if not any(c.isupper() for c in v):
            raise ValueError("Le mot de passe doit contenir au moins une majuscule")
        if not any(c.isdigit() for c in v):
            raise ValueError("Le mot de passe doit contenir au moins un chiffre")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str = Field(min_length=10)
    password: str = Field(min_length=8, max_length=128)

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if not re.search(r"[A-Z]", v):
            raise ValueError("Le mot de passe doit contenir au moins une majuscule")
        if not re.search(r"[0-9]", v):
            raise ValueError("Le mot de passe doit contenir au moins un chiffre")
        return v


class UserResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: UUID
    email: str
    role: RoleEnum
    is_active: bool
