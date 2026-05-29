from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import CurrentUser
from app.core.config import get_settings
from app.db.session import get_db
from app.models.patient import PatientProfile
from app.models.user import RoleEnum
from app.schemas.auth import LoginRequest, RefreshRequest, RegisterRequest, TokenResponse, UserResponse
from app.services import audit_service, auth_service

router = APIRouter(prefix="/auth", tags=["auth"])
limiter = Limiter(key_func=get_remote_address)
_settings = get_settings()


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    return forwarded.split(",")[0].strip() if forwarded else (
        request.client.host if request.client else "unknown"
    )


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(
    body: RegisterRequest,
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TokenResponse:
    """Self-service registration for patients only."""
    existing = await auth_service.get_user_by_email(db, body.email)
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email déjà utilisé")

    user = await auth_service.create_user(db, body.email, body.password, RoleEnum.patient)
    profile = PatientProfile(user_id=user.id, nom=body.nom, prenom=body.prenom)
    db.add(profile)
    await db.flush()

    tokens = await auth_service.issue_tokens(db, user)
    await audit_service.log_action(
        db, "register", user_id=user.id, resource_type="user",
        resource_id=str(user.id), ip_address=_client_ip(request),
    )
    await db.commit()
    return tokens


@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")
async def login(
    body: LoginRequest,
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TokenResponse:
    user = await auth_service.authenticate_user(db, body.email, body.password)
    ip = _client_ip(request)

    if user is None:
        await audit_service.log_action(db, "login_failed", ip_address=ip, detail=f"email={body.email}")
        await db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Identifiants invalides")

    tokens = await auth_service.issue_tokens(db, user)
    await audit_service.log_action(
        db, "login", user_id=user.id, resource_type="user",
        resource_id=str(user.id), ip_address=ip,
    )
    await db.commit()
    return tokens


@router.post("/refresh", response_model=TokenResponse)
async def refresh(
    body: RefreshRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TokenResponse:
    tokens = await auth_service.rotate_refresh_token(db, body.refresh_token)
    if tokens is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token invalide ou révoqué"
        )
    await db.commit()
    return tokens


@router.get("/me", response_model=UserResponse)
async def me(current_user: CurrentUser) -> UserResponse:
    return UserResponse.model_validate(current_user)
