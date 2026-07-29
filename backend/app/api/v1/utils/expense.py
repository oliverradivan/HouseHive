from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.v1.schemas import (
    ExpenseRead,
    ExpenseShareRead,
    HouseDebtRead,
    HouseMemberBalanceRead,
)
from app.api.v1.utils.house_member import require_house_member
from app.db.models import (
    Expense,
    ExpenseShare,
    HouseMember,
    HouseMemberRole,
    Settlement,
    User,
)


def get_expense_or_404(db: Session, expense_id: UUID) -> Expense:
    expense = db.get(Expense, expense_id)
    if expense is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense not found",
        )
    return expense


def require_house_member_id(
    db: Session, house_id: UUID, member_id: UUID
) -> HouseMember:
    member = db.get(HouseMember, member_id)
    if member is None or member.house_id != house_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="House member does not belong to this house",
        )
    return member


def get_house_member_ids(db: Session, house_id: UUID) -> list[UUID]:
    return list(
        db.scalars(
            select(HouseMember.id)
            .where(HouseMember.house_id == house_id)
            .order_by(HouseMember.created_at.asc())
        )
    )


def require_expense_editor(db: Session, expense: Expense, user_id: UUID) -> None:
    member = require_house_member(db, expense.house_id, user_id)
    if expense.paid_by_member_id == member.id or member.role == HouseMemberRole.ADMIN:
        return

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Expense payer or house admin access required",
    )


def split_amount_equally(amount_cents: int, member_ids: list[UUID]) -> dict[UUID, int]:
    sorted_member_ids = sorted(member_ids, key=str)
    base_share = amount_cents // len(sorted_member_ids)
    remainder = amount_cents % len(sorted_member_ids)

    return {
        member_id: base_share + (1 if index < remainder else 0)
        for index, member_id in enumerate(sorted_member_ids)
    }


def get_usernames_by_member_id(db: Session, house_id: UUID) -> dict[UUID, str]:
    return dict(
        db.execute(
            select(HouseMember.id, User.username)
            .join(User, User.id == HouseMember.user_id)
            .where(HouseMember.house_id == house_id)
        ).all()
    )


def build_expense_read(
    db: Session, expense: Expense, shares: list[ExpenseShare]
) -> ExpenseRead:
    usernames_by_member_id = get_usernames_by_member_id(db, expense.house_id)
    return ExpenseRead(
        id=expense.id,
        house_id=expense.house_id,
        paid_by_member_id=expense.paid_by_member_id,
        paid_by_username=usernames_by_member_id[expense.paid_by_member_id],
        title=expense.title,
        description=expense.description,
        amount_cents=expense.amount_cents,
        created_at=expense.created_at,
        updated_at=expense.updated_at,
        shares=[
            ExpenseShareRead(
                id=share.id,
                expense_id=share.expense_id,
                house_id=share.house_id,
                member_id=share.member_id,
                username=usernames_by_member_id[share.member_id],
                amount_cents=share.amount_cents,
            )
            for share in shares
        ],
    )


def get_expense_shares(db: Session, expense_id: UUID) -> list[ExpenseShare]:
    return list(
        db.scalars(
            select(ExpenseShare)
            .where(ExpenseShare.expense_id == expense_id)
            .order_by(ExpenseShare.created_at.asc())
        )
    )


def calculate_house_balances(
    db: Session, house_id: UUID
) -> list[HouseMemberBalanceRead]:
    member_rows = db.execute(
        select(HouseMember.id, User.username)
        .join(User, User.id == HouseMember.user_id)
        .where(HouseMember.house_id == house_id)
        .order_by(HouseMember.created_at.asc())
    ).all()
    usernames_by_member_id = dict(member_rows)
    balances = dict.fromkeys(
        [member_id for member_id, _username in member_rows],
        0,
    )

    paid_rows = db.execute(
        select(
            Expense.paid_by_member_id, func.coalesce(func.sum(Expense.amount_cents), 0)
        )
        .where(Expense.house_id == house_id)
        .group_by(Expense.paid_by_member_id)
    ).all()
    for member_id, total_paid in paid_rows:
        balances[member_id] += int(total_paid)

    share_rows = db.execute(
        select(
            ExpenseShare.member_id,
            func.coalesce(func.sum(ExpenseShare.amount_cents), 0),
        )
        .where(ExpenseShare.house_id == house_id)
        .group_by(ExpenseShare.member_id)
    ).all()
    for member_id, total_share in share_rows:
        balances[member_id] -= int(total_share)

    sent_rows = db.execute(
        select(
            Settlement.from_member_id,
            func.coalesce(func.sum(Settlement.amount_cents), 0),
        )
        .where(Settlement.house_id == house_id)
        .group_by(Settlement.from_member_id)
    ).all()
    for member_id, total_sent in sent_rows:
        balances[member_id] += int(total_sent)

    received_rows = db.execute(
        select(
            Settlement.to_member_id, func.coalesce(func.sum(Settlement.amount_cents), 0)
        )
        .where(Settlement.house_id == house_id)
        .group_by(Settlement.to_member_id)
    ).all()
    for member_id, total_received in received_rows:
        balances[member_id] -= int(total_received)

    return [
        HouseMemberBalanceRead(
            member_id=member_id,
            username=usernames_by_member_id[member_id],
            balance_cents=balance,
        )
        for member_id, balance in balances.items()
    ]


def calculate_house_debts(db: Session, house_id: UUID) -> list[HouseDebtRead]:
    balances = calculate_house_balances(db, house_id)
    usernames_by_member_id = {
        balance.member_id: balance.username for balance in balances
    }
    debtors = [
        [balance.member_id, -balance.balance_cents]
        for balance in balances
        if balance.balance_cents < 0
    ]
    creditors = [
        [balance.member_id, balance.balance_cents]
        for balance in balances
        if balance.balance_cents > 0
    ]

    debts: list[HouseDebtRead] = []
    debtor_index = 0
    creditor_index = 0
    while debtor_index < len(debtors) and creditor_index < len(creditors):
        debtor_id, debtor_amount = debtors[debtor_index]
        creditor_id, creditor_amount = creditors[creditor_index]
        amount = min(debtor_amount, creditor_amount)

        debts.append(
            HouseDebtRead(
                from_member_id=debtor_id,
                from_username=usernames_by_member_id[debtor_id],
                to_member_id=creditor_id,
                to_username=usernames_by_member_id[creditor_id],
                amount_cents=amount,
            )
        )

        debtors[debtor_index][1] -= amount
        creditors[creditor_index][1] -= amount

        if debtors[debtor_index][1] == 0:
            debtor_index += 1
        if creditors[creditor_index][1] == 0:
            creditor_index += 1

    return debts
