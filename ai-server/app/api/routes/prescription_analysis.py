from fastapi import APIRouter

from app.schemas.prescription_analysis import (
    PrescriptionAnalysisRequest,
    PrescriptionAnalysisResponse,
)
from app.services.prescription_check.prescription_check_service import (
    analyze_prescription_cautions,
)

router = APIRouter()


@router.post("/prescription-analysis", response_model=PrescriptionAnalysisResponse)
def analyze_prescription(request: PrescriptionAnalysisRequest) -> PrescriptionAnalysisResponse:
    return analyze_prescription_cautions(request)
