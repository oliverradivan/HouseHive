from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from fastapi import APIRouter, Depends, HTTPException, Response, status

from app.db.deps import get_db
from app.core.security import get_current_user
from app.db.models import Expense, ExpenseShare, User
from app.api.v1.schemas import (
    ExpenseRead,
    HouseDebtRead,
    ExpenseCreate,
    HouseMemberBalanceRead,
)
from app.api.v1.utils import (
    build_expense_read,
    get_expense_or_404,
    get_expense_shares,
    get_house_member_ids,
    require_house_member,
    split_amount_equally,
    calculate_house_debts,
    require_expense_editor,
    require_house_member_id,
    calculate_house_balances,
)


router = APIRouter(prefix="/houses/{house_id}/expenses", tags=["expenses"])
house_budget_router = APIRouter(prefix="/houses/{house_id}", tags=["expenses"])


@router.post(
    "",
    response_model=ExpenseRead,
    status_code=status.HTTP_201_CREATED,
)
def create_expense(
    house_id: UUID,
    expense_in: ExpenseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ExpenseRead:
    payer = require_house_member(db, house_id, current_user.id)
    participant_member_ids = expense_in.participant_member_ids
    if participant_member_ids is None:
        participant_member_ids = get_house_member_ids(db, house_id)

    for member_id in participant_member_ids:
        require_house_member_id(db, house_id, member_id)

    share_amounts = split_amount_equally(
        expense_in.amount_cents,
        participant_member_ids,
    )
    expense = Expense(
        house_id=house_id,
        paid_by_member_id=payer.id,
        title=expense_in.title,
        description=expense_in.description,
        amount_cents=expense_in.amount_cents,
    )

    db.add(expense)
    try:
        db.flush()
        shares = [
            ExpenseShare(
                expense_id=expense.id,
                house_id=house_id,
                member_id=member_id,
                amount_cents=amount_cents,
            )
            for member_id, amount_cents in share_amounts.items()
        ]
        db.add_all(shares)
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid expense data",
        ) from exc

    db.refresh(expense)
    return build_expense_read(db, expense, get_expense_shares(db, expense.id))


@router.get("", response_model=list[ExpenseRead])
def list_expenses(
    house_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[ExpenseRead]:
    require_house_member(db, house_id, current_user.id)
    expenses = list(
        db.scalars(
            select(Expense)
            .where(Expense.house_id == house_id)
            .order_by(Expense.created_at.desc())
        )
    )
    shares_by_expense_id = {
        expense.id: get_expense_shares(db, expense.id) for expense in expenses
    }
    return [
        build_expense_read(db, expense, shares_by_expense_id[expense.id])
        for expense in expenses
    ]


@router.get("/{expense_id}", response_model=ExpenseRead)
def read_expense(
    house_id: UUID,
    expense_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ExpenseRead:
    require_house_member(db, house_id, current_user.id)
    expense = get_expense_or_404(db, expense_id)
    if expense.house_id != house_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense not found",
        )
    return build_expense_read(db, expense, get_expense_shares(db, expense.id))


@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_expense(
    house_id: UUID,
    expense_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Response:
    require_house_member(db, house_id, current_user.id)
    expense = get_expense_or_404(db, expense_id)
    if expense.house_id != house_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Expense not found",
        )
    require_expense_editor(db, expense, current_user.id)

    db.execute(delete(ExpenseShare).where(ExpenseShare.expense_id == expense.id))
    db.delete(expense)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@house_budget_router.get("/balances", response_model=list[HouseMemberBalanceRead])
def read_house_balances(
    house_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[HouseMemberBalanceRead]:
    require_house_member(db, house_id, current_user.id)
    return calculate_house_balances(db, house_id)


@house_budget_router.get("/debts", response_model=list[HouseDebtRead])
def read_house_debts(
    house_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[HouseDebtRead]:
    require_house_member(db, house_id, current_user.id)
    return calculate_house_debts(db, house_id)
