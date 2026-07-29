from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.db.models import ChoreStatus


class ChoreBase(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: str = Field(min_length=1)


class ChoreCreate(ChoreBase):
    house_id: UUID


class ChoreUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = Field(default=None, min_length=1)
    status: ChoreStatus | None = None


class ChoreRead(ChoreBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    house_id: UUID
    creator_id: UUID
    creator_username: str
    status: ChoreStatus
