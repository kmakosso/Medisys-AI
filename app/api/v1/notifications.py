from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import CurrentUser
from app.db.session import get_db
from app.schemas.notification import NotificationResponse
from app.services import notification_service

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=list[NotificationResponse])
async def list_notifications(
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    unread_only: bool = Query(False),
) -> list[NotificationResponse]:
    notifs = await notification_service.list_for_user(db, current_user.id, unread_only=unread_only)
    return [NotificationResponse.model_validate(n) for n in notifs]


@router.get("/unread-count")
async def unread_count(
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    return {"count": await notification_service.count_unread(db, current_user.id)}


@router.patch("/{notif_id}/lu", status_code=status.HTTP_204_NO_CONTENT)
async def mark_read(
    notif_id: UUID,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    ok = await notification_service.mark_read(db, current_user.id, notif_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Notification introuvable")
    await db.commit()


@router.post("/lire-tout", status_code=status.HTTP_204_NO_CONTENT)
async def mark_all_read(
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    await notification_service.mark_all_read(db, current_user.id)
    await db.commit()
