import enum
import uuid
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import Enum, ForeignKey, UniqueConstraint, Uuid

from app.db.models.base_model import BaseModel


class HouseMemberRole(str, enum.Enum):
    MEMBER = "member"
    ADMIN = "admin"


class HouseMember(BaseModel):
    __tablename__ = "house_members"
    __table_args__ = (
        UniqueConstraint("user_id", "house_id", name="uq_house_members_user_house"),
        UniqueConstraint("id", "house_id", name="uq_house_members_id_house"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        ForeignKey("users.id"),
        nullable=False,
    )
    house_id: Mapped[uuid.UUID] = mapped_column(
        Uuid,
        ForeignKey("houses.id"),
        nullable=False,
    )
    role: Mapped[HouseMemberRole] = mapped_column(
        Enum(HouseMemberRole, name="house_member_role"),
        default=HouseMemberRole.MEMBER,
        nullable=False,
    )
