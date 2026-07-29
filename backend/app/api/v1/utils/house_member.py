from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.models import House, HouseMember, HouseMemberRole, User


def get_house_or_404(db: Session, house_id: UUID) -> House:
    house = db.get(House, house_id)
    if house is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="House not found",
        )
    return house


def get_user_or_404(db: Session, user_id: UUID) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    return user


def get_member_or_404(db: Session, member_id: UUID) -> HouseMember:
    member = db.get(HouseMember, member_id)
    if member is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="House member not found",
        )
    return member


def get_house_member(
    db: Session,
    house_id: UUID,
    user_id: UUID,
) -> HouseMember | None:
    return db.scalar(
        select(HouseMember).where(
            HouseMember.house_id == house_id,
            HouseMember.user_id == user_id,
        )
    )


def require_house_member(db: Session, house_id: UUID, user_id: UUID) -> HouseMember:
    member = get_house_member(db, house_id, user_id)
    if member is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="House membership required",
        )
    return member


def require_house_admin(db: Session, house_id: UUID, user_id: UUID) -> HouseMember:
    member = require_house_member(db, house_id, user_id)
    if member.role != HouseMemberRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="House admin access required",
        )
    return member


def prevent_removing_last_admin(
    db: Session,
    member: HouseMember,
    new_role: HouseMemberRole | None = None,
) -> None:
    if member.role != HouseMemberRole.ADMIN or new_role == HouseMemberRole.ADMIN:
        return

    admin_count = db.scalar(
        select(func.count()).where(
            HouseMember.house_id == member.house_id,
            HouseMember.role == HouseMemberRole.ADMIN,
        )
    )
    if admin_count == 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="House must have at least one admin",
        )
