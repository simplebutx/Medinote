from fastapi import APIRouter

from app.api.routes.chatbot import router as chatbot_router
from app.api.routes.consultation_summary import router as consultation_summary_router
from app.api.routes.health import router as health_router
from app.api.routes.ocr import router as ocr_router
from app.api.routes.qdrant import router as qdrant_router

api_router = APIRouter(prefix="/api/ai")
api_router.include_router(chatbot_router, tags=["chatbot"])
api_router.include_router(consultation_summary_router, tags=["consultation-summary"])
api_router.include_router(health_router, tags=["health"])
api_router.include_router(ocr_router, tags=["ocr"])
api_router.include_router(qdrant_router, tags=["qdrant"])
