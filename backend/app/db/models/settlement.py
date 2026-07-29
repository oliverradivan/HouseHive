import uuid
from datetime import datetime

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Text,
    Uuid,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.models.base_model import BaseModel


class Settlement(BaseModel):
    __tablename__ = "settlements"
    __table_args__ = (
        CheckConstraint(
            "amount_cents > 0",
            name="ck_settlements_amount_cents_positive",
        ),
        CheckConstraint(
            "from_member_id <> to_member_id",
            name="ck_settlements_different_members",
        ),
        ForeignKeyConstraint(
            ["from_member_id", "house_id"],
            ["house_members.id", "house_members.house_id"],
            name="fk_settlements_from_member_house",
        ),
        ForeignKeyConstraint(
            ["to_member_id", "house_id"],
            ["house_members.id", "house_members.house_id"],
            name="fk_settlements_to_member_house",
        ),
    )

    house_id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        ForeignKey("houses.id"),
        nullable=False,
    )
    from_member_id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        nullable=False,
    )
    to_member_id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        nullable=False,
    )
    amount_cents: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
    )
    note: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    settled_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
