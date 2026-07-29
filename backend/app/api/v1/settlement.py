from uuid import UUID
from sqlalchemy import select
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import APIRouter, Depends, HTTPException, status

from app.db.deps import get_db
from app.db.models import HouseMember, Settlement, User
from app.core.security import get_current_user
from app.api.v1.schemas import SettlementCreate, SettlementRead
from app.api.v1.utils import require_house_member, require_house_member_id


router = APIRouter(prefix="/houses/{house_id}/settlements", tags=["settlements"])


def build_settlement_read(
    settlement: Settlement, usernames_by_member_id: dict[UUID, str]
) -> SettlementRead:
    return SettlementRead(
        id=settlement.id,
        house_id=settlement.house_id,
        from_member_id=settlement.from_member_id,
        from_username=usernames_by_member_id[settlement.from_member_id],
        to_member_id=settlement.to_member_id,
        to_username=usernames_by_member_id[settlement.to_member_id],
        amount_cents=settlement.amount_cents,
        note=settlement.note,
        settled_at=settlement.settled_at,
        created_at=settlement.created_at,
        updated_at=settlement.updated_at,
    )


def get_usernames_by_member_id(db: Session, house_id: UUID) -> dict[UUID, str]:
    return dict(
        db.execute(
            select(HouseMember.id, User.username)
            .join(User, User.id == HouseMember.user_id)
            .where(HouseMember.house_id == house_id)
        ).all()
    )


@router.post(
    "",
    response_model=SettlementRead,
    status_code=status.HTTP_201_CREATED,
)
def create_settlement(
    house_id: UUID,
    settlement_in: SettlementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SettlementRead:
    require_house_member(db, house_id, current_user.id)
    require_house_member_id(db, house_id, settlement_in.from_member_id)
    require_house_member_id(db, house_id, settlement_in.to_member_id)

    if settlement_in.from_member_id == settlement_in.to_member_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Settlement members must be different",
        )

    settlement = Settlement(
        house_id=house_id,
        from_member_id=settlement_in.from_member_id,
        to_member_id=settlement_in.to_member_id,
        amount_cents=settlement_in.amount_cents,
        note=settlement_in.note,
    )
    if settlement_in.settled_at is not None:
        settlement.settled_at = settlement_in.settled_at

    db.add(settlement)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid settlement data",
        ) from exc

    db.refresh(settlement)
    return build_settlement_read(settlement, get_usernames_by_member_id(db, house_id))


@router.get("", response_model=list[SettlementRead])
def list_settlements(
    house_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[SettlementRead]:
    require_house_member(db, house_id, current_user.id)
    settlements = list(
        db.scalars(
            select(Settlement)
            .where(Settlement.house_id == house_id)
            .order_by(Settlement.settled_at.desc(), Settlement.created_at.desc())
        )
    )
    usernames_by_member_id = get_usernames_by_member_id(db, house_id)
    return [
        build_settlement_read(settlement, usernames_by_member_id)
        for settlement in settlements
    ]
