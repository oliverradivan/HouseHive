import uuid
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import (
    Text,
    Uuid,
    String,
    BigInteger,
    ForeignKey,
    CheckConstraint,
    ForeignKeyConstraint,
    UniqueConstraint,
)
from app.db.models.base_model import BaseModel


class Expense(BaseModel):
    __tablename__ = "expenses"
    __table_args__ = (
        CheckConstraint("amount_cents > 0", name="ck_expenses_amount_cents_positive"),
        ForeignKeyConstraint(
            ["paid_by_member_id", "house_id"],
            ["house_members.id", "house_members.house_id"],
            name="fk_expenses_paid_by_member_house",
        ),
        UniqueConstraint("id", "house_id", name="uq_expenses_id_house"),
    )

    paid_by_member_id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        nullable=False,
    )
    house_id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        ForeignKey("houses.id"),
        nullable=False,
    )
    title: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )
    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    amount_cents: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
    )
