from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from fastapi import APIRouter, Depends, HTTPException, Response, status

from app.api.v1.schemas import ChoreCreate, ChoreRead, ChoreUpdate
from app.api.v1.utils import (
    build_chore_read,
    get_chore_creator_username,
    get_chore_or_404,
    require_chore_editor,
    require_house_member,
)
from app.core.security import get_current_user
from app.db.deps import get_db
from app.db.models import Chore, ChoreCompletion, User


router = APIRouter(prefix="/chores", tags=["chores"])


@router.post(
    "",
    response_model=ChoreRead,
    status_code=status.HTTP_201_CREATED,
)
def create_chore(
    chore_in: ChoreCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ChoreRead:
    require_house_member(db, chore_in.house_id, current_user.id)
    chore = Chore(
        creator_id=current_user.id,
        house_id=chore_in.house_id,
        name=chore_in.name,
        description=chore_in.description,
    )

    db.add(chore)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid chore data",
        ) from exc

    db.refresh(chore)
    return build_chore_read(chore, current_user.username)


@router.get("", response_model=list[ChoreRead])
def list_chores(
    house_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[ChoreRead]:
    require_house_member(db, house_id, current_user.id)
    rows = db.execute(
        select(Chore, User.username)
        .join(User, User.id == Chore.creator_id)
        .where(Chore.house_id == house_id)
        .order_by(Chore.created_at.desc())
    ).all()
    return [
        build_chore_read(
            chore=chore,
            creator_username=creator_username,
        )
        for chore, creator_username in rows
    ]


@router.get("/{chore_id}", response_model=ChoreRead)
def read_chore(
    chore_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ChoreRead:
    chore = get_chore_or_404(db, chore_id)
    require_house_member(db, chore.house_id, current_user.id)
    return build_chore_read(chore, get_chore_creator_username(db, chore))


@router.patch("/{chore_id}", response_model=ChoreRead)
def update_chore(
    chore_id: UUID,
    chore_in: ChoreUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ChoreRead:
    chore = get_chore_or_404(db, chore_id)
    require_chore_editor(db, chore, current_user.id)
    update_data = chore_in.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(chore, field, value)

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid chore data",
        ) from exc

    db.refresh(chore)
    return build_chore_read(chore, get_chore_creator_username(db, chore))


@router.delete("/{chore_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_chore(
    chore_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Response:
    chore = get_chore_or_404(db, chore_id)
    require_chore_editor(db, chore, current_user.id)
    db.execute(delete(ChoreCompletion).where(ChoreCompletion.chore_id == chore.id))
    db.delete(chore)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
