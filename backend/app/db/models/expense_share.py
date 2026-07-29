import uuid
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    ForeignKey,
    ForeignKeyConstraint,
    UniqueConstraint,
    Uuid,
)
from app.db.models.base_model import BaseModel


class ExpenseShare(BaseModel):
    __tablename__ = "expense_shares"
    __table_args__ = (
        CheckConstraint(
            "amount_cents > 0",
            name="ck_expense_shares_amount_cents_positive",
        ),
        ForeignKeyConstraint(
            ["expense_id", "house_id"],
            ["expenses.id", "expenses.house_id"],
            name="fk_expense_shares_expense_house",
        ),
        ForeignKeyConstraint(
            ["member_id", "house_id"],
            ["house_members.id", "house_members.house_id"],
            name="fk_expense_shares_member_house",
        ),
        UniqueConstraint(
            "expense_id",
            "member_id",
            name="uq_expense_shares_expense_member",
        ),
    )

    expense_id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        nullable=False,
    )
    house_id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        ForeignKey("houses.id"),
        nullable=False,
    )
    member_id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        nullable=False,
    )
    amount_cents: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
    )
