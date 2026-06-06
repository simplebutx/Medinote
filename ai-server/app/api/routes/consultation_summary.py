from fastapi import APIRouter

from app.schemas.consultation_summary import (
    AiConsultationSummaryRequest,
    AiConsultationSummaryResponse,
)
from app.services.summary.consultation_summary_service import generate_consultation_summary

router = APIRouter()


@router.post("/consultation/summary", response_model=AiConsultationSummaryResponse)
def summarize_consultation(request: AiConsultationSummaryRequest) -> AiConsultationSummaryResponse:
    return AiConsultationSummaryResponse(summary=generate_consultation_summary(request.chatLog))
