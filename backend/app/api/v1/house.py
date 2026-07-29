from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from fastapi import APIRouter, Depends, HTTPException, Response, status

from app.db.deps import get_db
from app.core.security import get_current_user
from app.db.models import Expense, House, HouseMember, HouseMemberRole, Settlement, User
from app.api.v1.schemas import HouseCreate, HouseMemberRead, HouseRead, HouseUpdate
from app.api.v1.utils import (
    get_house_member,
    get_house_or_404,
    require_house_admin,
    require_house_member,
)


router = APIRouter(prefix="/houses", tags=["houses"])


def _house_has_financial_history(db: Session, house_id: UUID) -> bool:
    expense_exists = db.scalar(
        select(Expense.id).where(Expense.house_id == house_id).limit(1)
    )
    if expense_exists is not None:
        return True

    settlement_exists = db.scalar(
        select(Settlement.id).where(Settlement.house_id == house_id).limit(1)
    )
    return settlement_exists is not None


@router.post(
    "",
    response_model=HouseRead,
    status_code=status.HTTP_201_CREATED,
)
def create_house(
    house_in: HouseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> House:
    house = House(
        name=house_in.name,
        address=house_in.address,
        rooms=house_in.rooms,
    )

    db.add(house)
    try:
        db.flush()
        db.add(
            HouseMember(
                user_id=current_user.id,
                house_id=house.id,
                role=HouseMemberRole.ADMIN,
            )
        )
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid house data",
        ) from exc

    db.refresh(house)
    return house


@router.get("", response_model=list[HouseRead])
def list_houses(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[House]:
    return list(
        db.scalars(
            select(House)
            .join(HouseMember, HouseMember.house_id == House.id)
            .where(HouseMember.user_id == current_user.id)
            .order_by(House.created_at.desc())
        )
    )


@router.get("/{house_id}", response_model=HouseRead)
def get_house(
    house_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> House:
    require_house_member(db, house_id, current_user.id)
    return get_house_or_404(db, house_id)


@router.patch("/{house_id}", response_model=HouseRead)
def update_house(
    house_id: UUID,
    house_in: HouseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> House:
    require_house_admin(db, house_id, current_user.id)
    house = get_house_or_404(db, house_id)
    update_data = house_in.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(house, field, value)

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid house data",
        ) from exc

    db.refresh(house)
    return house


@router.delete("/{house_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_house(
    house_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Response:
    require_house_admin(db, house_id, current_user.id)
    house = get_house_or_404(db, house_id)
    if _house_has_financial_history(db, house_id):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete house with financial history",
        )

    db.execute(delete(HouseMember).where(HouseMember.house_id == house_id))
    db.delete(house)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/{house_id}/join",
    response_model=HouseMemberRead,
    status_code=status.HTTP_201_CREATED,
)
def join_house(
    house_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> HouseMember:
    get_house_or_404(db, house_id)
    existing_member = get_house_member(db, house_id, current_user.id)
    if existing_member is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User is already a member of this house",
        )

    member = HouseMember(
        user_id=current_user.id,
        house_id=house_id,
        role=HouseMemberRole.MEMBER,
    )
    db.add(member)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid house member data",
        ) from exc

    db.refresh(member)
    return member
