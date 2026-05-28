from fastapi import APIRouter

from app.schemas.ocr import AiOcrRequest, AiOcrResponse
from app.services.ocr_service import analyze_prescription

router = APIRouter()


@router.post("/ocr/prescriptions", response_model=AiOcrResponse)
def analyze_prescription_image(request: AiOcrRequest) -> AiOcrResponse:
    return analyze_prescription(request)
