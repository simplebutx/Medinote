from fastapi import APIRouter

from app.api.routes.chatbot import router as chatbot_router
from app.api.routes.health import router as health_router

api_router = APIRouter(prefix="/api/ai")
api_router.include_router(chatbot_router, tags=["chatbot"])
api_router.include_router(health_router, tags=["health"])
