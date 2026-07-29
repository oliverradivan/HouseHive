from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import CheckConstraint, Integer, String

from app.db.models.base_model import BaseModel


class House(BaseModel):
    __tablename__ = "houses"
    __table_args__ = (CheckConstraint("rooms > 0", name="ck_houses_rooms_positive"),)

    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )
    address: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    rooms: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )
