from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field, model_validator


class EventBase(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: str = Field(min_length=1)
    starts_at: datetime
    finishes_at: datetime

    @model_validator(mode="after")
    def validate_time_range(self) -> "EventBase":
        if self.finishes_at <= self.starts_at:
            raise ValueError("finishes_at must be after starts_at")
        return self


class EventCreate(EventBase):
    house_id: UUID


class EventUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = Field(default=None, min_length=1)
    starts_at: datetime | None = None
    finishes_at: datetime | None = None

    @model_validator(mode="after")
    def validate_time_range(self) -> "EventUpdate":
        if (
            self.starts_at is not None
            and self.finishes_at is not None
            and self.finishes_at <= self.starts_at
        ):
            raise ValueError("finishes_at must be after starts_at")
        return self


class EventRead(EventBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    house_id: UUID
    creator_id: UUID
    creator_username: str
