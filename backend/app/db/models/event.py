import uuid
from datetime import datetime
from sqlalchemy import (
    Text,
    Uuid,
    String,
    DateTime,
    ForeignKey,
    CheckConstraint,
    ForeignKeyConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.models.base_model import BaseModel


class Event(BaseModel):
    __tablename__ = "events"
    __table_args__ = (
        CheckConstraint(
            "finishes_at > starts_at",
            name="ck_events_finishes_after_starts",
        ),
        ForeignKeyConstraint(
            ["member_id", "house_id"],
            ["house_members.id", "house_members.house_id"],
            name="fk_events_member_house",
        ),
    )

    creator_id: Mapped[uuid.UUID] = mapped_column(
        "member_id",
        Uuid,
        nullable=False,
    )
    house_id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        ForeignKey("houses.id"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )
    description: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    starts_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    finishes_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
