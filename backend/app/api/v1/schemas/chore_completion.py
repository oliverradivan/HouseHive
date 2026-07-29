from uuid import UUID

from pydantic import BaseModel, ConfigDict


class ChoreCompletionCreate(BaseModel):
    chore_id: UUID


class ChoreCompletionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    chore_id: UUID
    house_id: UUID
    completed_by_username: str
