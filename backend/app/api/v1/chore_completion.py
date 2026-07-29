from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.v1.schemas import ChoreCompletionCreate, ChoreCompletionRead
from app.api.v1.utils import (
    build_chore_completion_read,
    get_chore_completion_or_404,
    get_chore_completion_username,
    get_chore_or_404,
    require_chore_completion_editor,
    require_house_member,
)
from app.core.security import get_current_user
from app.db.deps import get_db
from app.db.models import ChoreCompletion, User


router = APIRouter(prefix="/chore-completions", tags=["chore-completions"])


@router.post(
    "",
    response_model=ChoreCompletionRead,
    status_code=status.HTTP_201_CREATED,
)
def create_chore_completion(
    completion_in: ChoreCompletionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ChoreCompletionRead:
    chore = get_chore_or_404(db, completion_in.chore_id)
    require_house_member(db, chore.house_id, current_user.id)

    completion = ChoreCompletion(
        user_id=current_user.id,
        chore_id=chore.id,
        house_id=chore.house_id,
    )
    db.add(completion)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Chore is already completed by this user",
        ) from exc

    db.refresh(completion)
    return build_chore_completion_read(completion, current_user.username)


@router.get("", response_model=list[ChoreCompletionRead])
def list_chore_completions(
    chore_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[ChoreCompletionRead]:
    chore = get_chore_or_404(db, chore_id)
    require_house_member(db, chore.house_id, current_user.id)
    rows = db.execute(
        select(ChoreCompletion, User.username)
        .join(User, User.id == ChoreCompletion.user_id)
        .where(ChoreCompletion.chore_id == chore_id)
        .order_by(ChoreCompletion.created_at.desc())
    ).all()
    return [
        build_chore_completion_read(
            completion=completion,
            completed_by_username=completed_by_username,
        )
        for completion, completed_by_username in rows
    ]


@router.get("/{completion_id}", response_model=ChoreCompletionRead)
def read_chore_completion(
    completion_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ChoreCompletionRead:
    completion = get_chore_completion_or_404(db, completion_id)
    require_house_member(db, completion.house_id, current_user.id)
    return build_chore_completion_read(
        completion,
        get_chore_completion_username(db, completion),
    )


@router.delete("/{completion_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_chore_completion(
    completion_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Response:
    completion = get_chore_completion_or_404(db, completion_id)
    require_chore_completion_editor(db, completion, current_user.id)
    db.delete(completion)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
