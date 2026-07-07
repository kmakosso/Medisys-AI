from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import CurrentUser
from app.db.session import get_db
from app.models.medecin import MedecinProfile
from app.models.messaging import Conversation, Message
from app.models.patient import PatientProfile
from app.models.user import RoleEnum, User
from app.schemas.messaging import (
    ConversationCreate,
    ConversationResponse,
    MessageCreate,
    MessageResponse,
)
from app.services import messaging_service, notification_service

router = APIRouter(prefix="/messages", tags=["messages"])


async def _patient_of(db: AsyncSession, user: User) -> PatientProfile | None:
    res = await db.execute(select(PatientProfile).where(PatientProfile.user_id == user.id))
    return res.scalar_one_or_none()


async def _medecin_of(db: AsyncSession, user: User) -> MedecinProfile | None:
    res = await db.execute(select(MedecinProfile).where(MedecinProfile.user_id == user.id))
    return res.scalar_one_or_none()


async def _conversation_for_user(
    db: AsyncSession, conv_id: UUID, user: User
) -> Conversation:
    res = await db.execute(select(Conversation).where(Conversation.id == conv_id))
    conv = res.scalar_one_or_none()
    if conv is None:
        raise HTTPException(status_code=404, detail="Conversation introuvable")
    # Vérifie l'appartenance selon le rôle
    if user.role == RoleEnum.patient:
        p = await _patient_of(db, user)
        if not p or conv.patient_id != p.id:
            raise HTTPException(status_code=403, detail="Accès refusé")
    elif user.role == RoleEnum.medecin:
        m = await _medecin_of(db, user)
        if not m or conv.medecin_id != m.id:
            raise HTTPException(status_code=403, detail="Accès refusé")
    else:
        raise HTTPException(status_code=403, detail="Accès refusé")
    return conv


async def _enrich(db: AsyncSession, conv: Conversation, user: User) -> ConversationResponse:
    # Nom de l'interlocuteur + dernier message + non-lus (pour le user courant)
    if user.role == RoleEnum.patient:
        mr = await db.execute(select(MedecinProfile).where(MedecinProfile.id == conv.medecin_id))
        other = mr.scalar_one_or_none()
        nom = f"Dr {other.prenom} {other.nom}" if other else None
    else:
        pr = await db.execute(select(PatientProfile).where(PatientProfile.id == conv.patient_id))
        other = pr.scalar_one_or_none()
        nom = f"{other.prenom} {other.nom}" if other else None

    last = await db.execute(
        select(Message)
        .where(Message.conversation_id == conv.id)
        .order_by(Message.created_at.desc())
        .limit(1)
    )
    last_msg = last.scalar_one_or_none()
    unread = await db.execute(
        select(Message).where(
            Message.conversation_id == conv.id,
            Message.lu.is_(False),
            Message.sender_user_id != user.id,
        )
    )
    non_lus = len(unread.scalars().all())

    return ConversationResponse(
        id=conv.id,
        patient_id=conv.patient_id,
        medecin_id=conv.medecin_id,
        interlocuteur_nom=nom,
        dernier_message=last_msg.contenu if last_msg else None,
        non_lus=non_lus,
        updated_at=conv.updated_at,
    )


@router.get("", response_model=list[ConversationResponse])
async def list_conversations(
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[ConversationResponse]:
    if current_user.role == RoleEnum.patient:
        p = await _patient_of(db, current_user)
        if not p:
            return []
        res = await db.execute(
            select(Conversation).where(Conversation.patient_id == p.id).order_by(
                Conversation.updated_at.desc()
            )
        )
    elif current_user.role == RoleEnum.medecin:
        m = await _medecin_of(db, current_user)
        if not m:
            return []
        res = await db.execute(
            select(Conversation).where(Conversation.medecin_id == m.id).order_by(
                Conversation.updated_at.desc()
            )
        )
    else:
        raise HTTPException(status_code=403, detail="Accès refusé")
    return [await _enrich(db, c, current_user) for c in res.scalars().all()]


@router.post("", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
async def start_conversation(
    body: ConversationCreate,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ConversationResponse:
    """Démarre/récupère une conversation. Autorisée seulement si RDV partagé
    confirmé/terminé entre les deux."""
    if current_user.role == RoleEnum.patient:
        p = await _patient_of(db, current_user)
        if not p or not body.medecin_id:
            raise HTTPException(status_code=400, detail="medecin_id requis")
        patient_id, medecin_id = p.id, body.medecin_id
    elif current_user.role == RoleEnum.medecin:
        m = await _medecin_of(db, current_user)
        if not m or not body.patient_id:
            raise HTTPException(status_code=400, detail="patient_id requis")
        patient_id, medecin_id = body.patient_id, m.id
    else:
        raise HTTPException(status_code=403, detail="Accès refusé")

    if not await messaging_service.can_communicate(db, patient_id, medecin_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Un rendez-vous confirmé est requis pour échanger des messages",
        )

    conv = await messaging_service.get_or_create_conversation(db, patient_id, medecin_id)
    await db.commit()
    await db.refresh(conv)
    return await _enrich(db, conv, current_user)


@router.get("/{conversation_id}", response_model=list[MessageResponse])
async def get_messages(
    conversation_id: UUID,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[MessageResponse]:
    conv = await _conversation_for_user(db, conversation_id, current_user)
    res = await db.execute(
        select(Message).where(Message.conversation_id == conv.id).order_by(Message.created_at)
    )
    messages = list(res.scalars().all())
    # Marque comme lus les messages reçus
    for msg in messages:
        if msg.sender_user_id != current_user.id and not msg.lu:
            msg.lu = True
    await db.commit()
    return [MessageResponse.model_validate(m) for m in messages]


@router.post("/{conversation_id}", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def send_message(
    conversation_id: UUID,
    body: MessageCreate,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> MessageResponse:
    conv = await _conversation_for_user(db, conversation_id, current_user)
    msg = Message(
        conversation_id=conv.id, sender_user_id=current_user.id, contenu=body.contenu
    )
    db.add(msg)

    # Notifie l'autre partie
    if current_user.role == RoleEnum.patient:
        mr = await db.execute(select(MedecinProfile).where(MedecinProfile.id == conv.medecin_id))
        other = mr.scalar_one_or_none()
        target_user_id = other.user_id if other else None
    else:
        pr = await db.execute(select(PatientProfile).where(PatientProfile.id == conv.patient_id))
        other = pr.scalar_one_or_none()
        target_user_id = other.user_id if other else None
    if target_user_id:
        await notification_service.notify(
            db, target_user_id, "nouveau_message", "Vous avez reçu un nouveau message."
        )

    await db.commit()
    await db.refresh(msg)
    return MessageResponse.model_validate(msg)
