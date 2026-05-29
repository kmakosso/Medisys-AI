from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification


async def notify(db: AsyncSession, user_id: UUID, type_: str, message: str) -> None:
    """Crée une notification in-app. Ne lève jamais (best-effort, comme l'audit)."""
    try:
        db.add(Notification(user_id=user_id, type=type_, message=message))
        await db.flush()
    except Exception:
        pass


async def list_for_user(
    db: AsyncSession, user_id: UUID, unread_only: bool = False, limit: int = 50
) -> list[Notification]:
    q = select(Notification).where(Notification.user_id == user_id)
    if unread_only:
        q = q.where(Notification.lu.is_(False))
    q = q.order_by(Notification.created_at.desc()).limit(limit)
    result = await db.execute(q)
    return list(result.scalars().all())


async def count_unread(db: AsyncSession, user_id: UUID) -> int:
    result = await db.execute(
        select(Notification).where(Notification.user_id == user_id, Notification.lu.is_(False))
    )
    return len(result.scalars().all())


async def mark_read(db: AsyncSession, user_id: UUID, notif_id: UUID) -> bool:
    result = await db.execute(
        select(Notification).where(
            Notification.id == notif_id, Notification.user_id == user_id
        )
    )
    notif = result.scalar_one_or_none()
    if notif is None:
        return False
    notif.lu = True
    await db.flush()
    return True


async def mark_all_read(db: AsyncSession, user_id: UUID) -> None:
    await db.execute(
        update(Notification)
        .where(Notification.user_id == user_id, Notification.lu.is_(False))
        .values(lu=True)
    )
    await db.flush()
