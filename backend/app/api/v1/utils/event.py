from uuid import UUID
from sqlalchemy import select
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.db.models import Event, HouseMember, HouseMemberRole, User
from app.api.v1.schemas.event import EventRead
from app.api.v1.utils.house_member import require_house_member


def get_event_or_404(db: Session, event_id: UUID) -> Event:
    event = db.get(Event, event_id)
    if event is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event not found",
        )
    return event


def require_event_editor(db: Session, event: Event, user_id: UUID) -> None:
    member = require_house_member(db, event.house_id, user_id)
    if member.id == event.creator_id or member.role == HouseMemberRole.ADMIN:
        return

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Event creator or house admin access required",
    )


def get_event_creator_username(db: Session, event: Event) -> str:
    username = db.scalar(
        select(User.username)
        .join(HouseMember, HouseMember.user_id == User.id)
        .where(HouseMember.id == event.creator_id)
    )
    if username is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Event creator not found",
        )
    return username


def build_event_read(event: Event, creator_username: str) -> EventRead:
    return EventRead(
        id=event.id,
        house_id=event.house_id,
        creator_id=event.creator_id,
        creator_username=creator_username,
        name=event.name,
        description=event.description,
        starts_at=event.starts_at,
        finishes_at=event.finishes_at,
    )
