"""
Security utilities:
- Argon2 password hashing
- JWT access + refresh token creation/validation
- AES-GCM field-level encryption for sensitive dossier content
  Choice rationale: AES-GCM provides authenticated encryption (prevents tampering),
  uses a random nonce per encrypt call, and is FIPS-approved. The key is loaded
  from the environment — never stored in the database.
"""

import base64
import os
from datetime import UTC, datetime, timedelta
from typing import Any

from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from jose import JWTError, jwt

from app.core.config import get_settings

_ph = PasswordHasher()
settings = get_settings()

# ─── Password ────────────────────────────────────────────────────────────────


def hash_password(plain: str) -> str:
    return _ph.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return _ph.verify(hashed, plain)
    except VerifyMismatchError:
        return False


# ─── JWT ─────────────────────────────────────────────────────────────────────


def _create_token(data: dict[str, Any], expires_delta: timedelta) -> str:
    payload = data.copy()
    payload["exp"] = datetime.now(UTC) + expires_delta
    payload["iat"] = datetime.now(UTC)
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def create_access_token(user_id: str, role: str) -> str:
    return _create_token(
        {"sub": user_id, "role": role, "type": "access"},
        timedelta(minutes=settings.access_token_expire_minutes),
    )


def create_refresh_token(user_id: str, jti: str) -> str:
    return _create_token(
        {"sub": user_id, "jti": jti, "type": "refresh"},
        timedelta(days=settings.refresh_token_expire_days),
    )


def decode_token(token: str) -> dict[str, Any]:
    """Raises JWTError if invalid or expired."""
    return jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])


# ─── Field-level encryption (AES-GCM) ────────────────────────────────────────
# Key must be 16, 24, or 32 bytes (128/192/256 bit). We derive 32 bytes from
# the base64-encoded env variable so the key is easy to rotate.


def _get_aes_key() -> bytes:
    raw = settings.field_encryption_key
    # Accept both raw bytes (hex) and base64-url encoded keys (Fernet format)
    try:
        key = base64.urlsafe_b64decode(raw + "==")[:32]
    except Exception:
        key = raw.encode()[:32]
    return key.ljust(32, b"\x00")


def encrypt_field(plaintext: str) -> str:
    """Returns base64url(nonce || ciphertext) for storage."""
    key = _get_aes_key()
    aesgcm = AESGCM(key)
    nonce = os.urandom(12)
    ct = aesgcm.encrypt(nonce, plaintext.encode(), None)
    return base64.urlsafe_b64encode(nonce + ct).decode()


def decrypt_field(blob: str) -> str:
    """Decrypts a value produced by encrypt_field."""
    key = _get_aes_key()
    aesgcm = AESGCM(key)
    raw = base64.urlsafe_b64decode(blob)
    nonce, ct = raw[:12], raw[12:]
    return aesgcm.decrypt(nonce, ct, None).decode()
