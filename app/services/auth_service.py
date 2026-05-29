import secrets
from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.models.refresh_token import RefreshToken
from app.models.user import RoleEnum, User
from app.schemas.auth import TokenResponse

settings = get_settings()


async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
    result = await db.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()


async def get_user_by_id(db: AsyncSession, user_id: UUID) -> User | None:
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def create_user(
    db: AsyncSession, email: str, password: str, role: RoleEnum
) -> User:
    user = User(email=email, hashed_password=hash_password(password), role=role)
    db.add(user)
    await db.flush()
    return user


async def authenticate_user(db: AsyncSession, email: str, password: str) -> User | None:
    user = await get_user_by_email(db, email)
    if user is None or not user.is_active:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


async def issue_tokens(db: AsyncSession, user: User) -> TokenResponse:
    jti = secrets.token_hex(32)
    access_token = create_access_token(str(user.id), user.role.value)
    refresh_token = create_refresh_token(str(user.id), jti)

    rt = RefreshToken(
        jti=jti,
        user_id=user.id,
        expires_at=datetime.now(UTC) + timedelta(days=settings.refresh_token_expire_days),
    )
    db.add(rt)
    await db.flush()

    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


async def is_refresh_token_revoked(db: AsyncSession, jti: str) -> bool:
    result = await db.execute(
        select(RefreshToken).where(RefreshToken.jti == jti, RefreshToken.revoked.is_(False))
    )
    return result.scalar_one_or_none() is None


async def revoke_refresh_token(db: AsyncSession, jti: str) -> None:
    result = await db.execute(select(RefreshToken).where(RefreshToken.jti == jti))
    rt = result.scalar_one_or_none()
    if rt:
        rt.revoked = True
        await db.flush()


async def rotate_refresh_token(db: AsyncSession, old_token: str) -> TokenResponse | None:
    """Validate + revoke old refresh token, issue new pair. Returns None if invalid."""
    try:
        payload = decode_token(old_token)
    except Exception:
        return None

    if payload.get("type") != "refresh":
        return None

    jti: str = payload.get("jti", "")
    user_id: str = payload.get("sub", "")

    if await is_refresh_token_revoked(db, jti):
        return None

    await revoke_refresh_token(db, jti)

    user = await get_user_by_id(db, UUID(user_id))
    if user is None or not user.is_active:
        return None

    return await issue_tokens(db, user)
