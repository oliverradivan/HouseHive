from uuid import UUID
from pydantic import BaseModel, ConfigDict

from app.db.models import HouseMemberRole
from app.api.v1.schemas.user import UserRead


class HouseMemberCreate(BaseModel):
    user_id: UUID
    house_id: UUID
    role: HouseMemberRole = HouseMemberRole.MEMBER


class HouseMemberUpdate(BaseModel):
    role: HouseMemberRole


class HouseMemberRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    house_id: UUID
    role: HouseMemberRole


class HouseMemberUserRead(BaseModel):
    user: UserRead
    role: HouseMemberRole
