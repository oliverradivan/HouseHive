from uuid import UUID
from sqlalchemy import select
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import APIRouter, Depends, HTTPException, Response, status

from app.db.deps import get_db
from app.db.models import Expense, ExpenseShare, HouseMember, Settlement, User
from app.core.security import get_current_user
from app.api.v1.schemas import (
    HouseMemberCreate,
    HouseMemberRead,
    HouseMemberUpdate,
    HouseMemberUserRead,
)
from app.api.v1.utils import (
    get_user_or_404,
    get_house_member,
    get_house_or_404,
    get_member_or_404,
    require_house_admin,
    require_house_member,
    prevent_removing_last_admin,
)


router = APIRouter(prefix="/house-members", tags=["house-members"])


def _member_has_financial_history(db: Session, member_id: UUID) -> bool:
    paid_expense_exists = db.scalar(
        select(Expense.id).where(Expense.paid_by_member_id == member_id).limit(1)
    )
    if paid_expense_exists is not None:
        return True

    expense_share_exists = db.scalar(
        select(ExpenseShare.id).where(ExpenseShare.member_id == member_id).limit(1)
    )
    if expense_share_exists is not None:
        return True

    settlement_exists = db.scalar(
        select(Settlement.id)
        .where(
            (Settlement.from_member_id == member_id)
            | (Settlement.to_member_id == member_id)
        )
        .limit(1)
    )
    return settlement_exists is not None


@router.post(
    "",
    response_model=HouseMemberRead,
    status_code=status.HTTP_201_CREATED,
)
def create_house_member(
    member_in: HouseMemberCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> HouseMember:
    get_house_or_404(db, member_in.house_id)
    get_user_or_404(db, member_in.user_id)
    require_house_admin(db, member_in.house_id, current_user.id)

    existing_member = get_house_member(db, member_in.house_id, member_in.user_id)
    if existing_member is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User is already a member of this house",
        )

    member = HouseMember(
        user_id=member_in.user_id,
        house_id=member_in.house_id,
        role=member_in.role,
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


@router.get("", response_model=list[HouseMemberUserRead])
def list_house_members(
    house_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[HouseMemberUserRead]:
    require_house_member(db, house_id, current_user.id)
    rows = db.execute(
        select(User, HouseMember.role)
        .join(HouseMember, HouseMember.user_id == User.id)
        .where(HouseMember.house_id == house_id)
        .order_by(HouseMember.created_at.asc())
    ).all()
    return [
        HouseMemberUserRead(
            user=user,
            role=role,
        )
        for user, role in rows
    ]


@router.get("/{member_id}", response_model=HouseMemberRead)
def read_house_member(
    member_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> HouseMember:
    member = get_member_or_404(db, member_id)
    require_house_member(db, member.house_id, current_user.id)
    return member


@router.patch("/{member_id}", response_model=HouseMemberRead)
def update_house_member(
    member_id: UUID,
    member_in: HouseMemberUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> HouseMember:
    member = get_member_or_404(db, member_id)
    require_house_admin(db, member.house_id, current_user.id)
    prevent_removing_last_admin(db, member, member_in.role)

    member.role = member_in.role
    db.commit()
    db.refresh(member)
    return member


@router.delete("/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_house_member(
    member_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Response:
    member = get_member_or_404(db, member_id)
    if member.user_id != current_user.id:
        require_house_admin(db, member.house_id, current_user.id)

    prevent_removing_last_admin(db, member)
    if _member_has_financial_history(db, member_id):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete house member with financial history",
        )

    db.delete(member)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
