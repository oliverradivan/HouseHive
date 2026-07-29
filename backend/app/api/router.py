from fastapi import APIRouter
from app.api.v1 import (
    auth_router,
    chore_completion_router,
    chore_router,
    event_router,
    expense_router,
    house_router,
    house_budget_router,
    house_member_router,
    settlement_router,
)


api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(chore_router)
api_router.include_router(event_router)
api_router.include_router(house_router)
api_router.include_router(house_member_router)
api_router.include_router(chore_completion_router)
api_router.include_router(expense_router)
api_router.include_router(house_budget_router)
api_router.include_router(settlement_router)
