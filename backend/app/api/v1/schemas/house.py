from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field


class HouseBase(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    address: str = Field(min_length=1, max_length=255)
    rooms: int = Field(gt=0)


class HouseCreate(HouseBase):
    pass


class HouseUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    address: str | None = Field(default=None, min_length=1, max_length=255)
    rooms: int | None = Field(default=None, gt=0)


class HouseRead(HouseBase):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
