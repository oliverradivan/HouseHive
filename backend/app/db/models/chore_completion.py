import uuid
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import ForeignKey, ForeignKeyConstraint, UniqueConstraint, Uuid

from app.db.models.base_model import BaseModel


class ChoreCompletion(BaseModel):
    __tablename__ = "chore_completions"
    __table_args__ = (
        ForeignKeyConstraint(
            ["chore_id", "house_id"],
            ["chores.id", "chores.house_id"],
            name="fk_chore_completions_chore_house",
        ),
        ForeignKeyConstraint(
            ["user_id", "house_id"],
            ["house_members.user_id", "house_members.house_id"],
            name="fk_chore_completions_user_house_member",
        ),
        UniqueConstraint("user_id", "chore_id", name="uq_chore_completions_user_chore"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        ForeignKey("users.id"),
        nullable=False,
    )
    chore_id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        ForeignKey("chores.id"),
        nullable=False,
    )
    house_id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        ForeignKey("houses.id"),
        nullable=False,
    )
