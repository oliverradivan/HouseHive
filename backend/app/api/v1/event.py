from uuid import UUID
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import APIRouter, Depends, HTTPException, Response, status

from app.db.deps import get_db
from app.db.models import Event, HouseMember, User
from app.core.security import get_current_user
from app.api.v1.schemas import EventCreate, EventRead, EventUpdate
from app.api.v1.utils import (
    build_event_read,
    get_event_creator_username,
    get_event_or_404,
    require_event_editor,
    require_house_member,
)


router = APIRouter(prefix="/events", tags=["events"])


@router.post(
    "",
    response_model=EventRead,
    status_code=status.HTTP_201_CREATED,
)
def create_event(
    event_in: EventCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> EventRead:
    creator = require_house_member(db, event_in.house_id, current_user.id)
    if event_in.finishes_at <= datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="finishes_at must be in the future",
        )

    event = Event(
        creator_id=creator.id,
        house_id=event_in.house_id,
        name=event_in.name,
        description=event_in.description,
        starts_at=event_in.starts_at,
        finishes_at=event_in.finishes_at,
    )

    db.add(event)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid event data",
        ) from exc

    db.refresh(event)
    return build_event_read(event, current_user.username)


@router.get("", response_model=list[EventRead])
def list_events(
    house_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[EventRead]:
    require_house_member(db, house_id, current_user.id)
    rows = db.execute(
        select(Event, User.username)
        .join(HouseMember, HouseMember.id == Event.creator_id)
        .join(User, User.id == HouseMember.user_id)
        .where(Event.house_id == house_id, Event.finishes_at > datetime.now(timezone.utc))
        .order_by(Event.starts_at.asc())
    ).all()
    return [
        build_event_read(
            event=event,
            creator_username=creator_username,
        )
        for event, creator_username in rows
    ]


@router.get("/{event_id}", response_model=EventRead)
def read_event(
    event_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> EventRead:
    event = get_event_or_404(db, event_id)
    require_house_member(db, event.house_id, current_user.id)
    return build_event_read(event, get_event_creator_username(db, event))


@router.patch("/{event_id}", response_model=EventRead)
def update_event(
    event_id: UUID,
    event_in: EventUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> EventRead:
    event = get_event_or_404(db, event_id)
    require_event_editor(db, event, current_user.id)
    update_data = event_in.model_dump(exclude_unset=True)

    next_starts_at = update_data.get("starts_at", event.starts_at)
    next_finishes_at = update_data.get("finishes_at", event.finishes_at)
    if next_finishes_at <= next_starts_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="finishes_at must be after starts_at",
        )

    for field, value in update_data.items():
        setattr(event, field, value)

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid event data",
        ) from exc

    db.refresh(event)
    return build_event_read(event, get_event_creator_username(db, event))


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event(
    event_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Response:
    event = get_event_or_404(db, event_id)
    require_event_editor(db, event, current_user.id)
    db.delete(event)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
