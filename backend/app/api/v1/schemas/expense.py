from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field, model_validator


class ExpenseShareCreate(BaseModel):
    member_id: UUID
    amount_cents: int = Field(gt=0)


class ExpenseShareRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    expense_id: UUID
    house_id: UUID
    member_id: UUID
    username: str
    amount_cents: int


class ExpenseCreate(BaseModel):
    title: str = Field(min_length=1, max_length=100)
    description: str | None = None
    amount_cents: int = Field(gt=0)
    participant_member_ids: list[UUID] | None = Field(default=None, min_length=1)

    @model_validator(mode="after")
    def validate_participants(self) -> "ExpenseCreate":
        if self.participant_member_ids is None:
            return self

        if len(set(self.participant_member_ids)) != len(self.participant_member_ids):
            raise ValueError("participant_member_ids must not contain duplicates")
        return self


class ExpenseRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    house_id: UUID
    paid_by_member_id: UUID
    paid_by_username: str
    title: str
    description: str | None
    amount_cents: int
    created_at: datetime
    updated_at: datetime
    shares: list[ExpenseShareRead]


class HouseMemberBalanceRead(BaseModel):
    member_id: UUID
    username: str
    balance_cents: int


class HouseDebtRead(BaseModel):
    from_member_id: UUID
    from_username: str
    to_member_id: UUID
    to_username: str
    amount_cents: int
