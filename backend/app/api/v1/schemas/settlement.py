from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class SettlementCreate(BaseModel):
    from_member_id: UUID
    to_member_id: UUID
    amount_cents: int = Field(gt=0)
    note: str | None = None
    settled_at: datetime | None = None


class SettlementRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    house_id: UUID
    from_member_id: UUID
    from_username: str
    to_member_id: UUID
    to_username: str
    amount_cents: int
    note: str | None
    settled_at: datetime
    created_at: datetime
    updated_at: datetime
