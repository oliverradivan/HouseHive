from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.v1.schemas import ChoreCompletionRead, ChoreRead
from app.api.v1.utils.house_member import require_house_member
from app.db.models import Chore, ChoreCompletion, HouseMemberRole, User


def get_chore_or_404(db: Session, chore_id: UUID) -> Chore:
    chore = db.get(Chore, chore_id)
    if chore is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chore not found",
        )
    return chore


def get_chore_completion_or_404(
    db: Session,
    completion_id: UUID,
) -> ChoreCompletion:
    completion = db.get(ChoreCompletion, completion_id)
    if completion is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chore completion not found",
        )
    return completion


def require_chore_editor(db: Session, chore: Chore, user_id: UUID) -> None:
    member = require_house_member(db, chore.house_id, user_id)
    if chore.creator_id == user_id or member.role == HouseMemberRole.ADMIN:
        return

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Chore creator or house admin access required",
    )


def require_chore_completion_editor(
    db: Session,
    completion: ChoreCompletion,
    user_id: UUID,
) -> None:
    member = require_house_member(db, completion.house_id, user_id)
    if completion.user_id == user_id or member.role == HouseMemberRole.ADMIN:
        return

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Completion owner or house admin access required",
    )


def get_chore_creator_username(db: Session, chore: Chore) -> str:
    username = db.scalar(select(User.username).where(User.id == chore.creator_id))
    if username is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chore creator not found",
        )
    return username


def get_chore_completion_username(db: Session, completion: ChoreCompletion) -> str:
    username = db.scalar(select(User.username).where(User.id == completion.user_id))
    if username is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chore completion user not found",
        )
    return username


def build_chore_read(chore: Chore, creator_username: str) -> ChoreRead:
    return ChoreRead(
        id=chore.id,
        house_id=chore.house_id,
        creator_id=chore.creator_id,
        creator_username=creator_username,
        name=chore.name,
        description=chore.description,
        status=chore.status,
    )


def build_chore_completion_read(
    completion: ChoreCompletion,
    completed_by_username: str,
) -> ChoreCompletionRead:
    return ChoreCompletionRead(
        id=completion.id,
        user_id=completion.user_id,
        chore_id=completion.chore_id,
        house_id=completion.house_id,
        completed_by_username=completed_by_username,
    )
