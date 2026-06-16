from fastapi import APIRouter

from app.schemas.medicine_caution_tag import MedicineCautionTagExtractResponse
from app.services.medicine_caution_tag.medicine_caution_tag_service import (
    extract_medicine_caution_tags,
)

router = APIRouter()


@router.get("/medicine-caution-tags/extract", response_model=MedicineCautionTagExtractResponse)
def extract_caution_tags() -> MedicineCautionTagExtractResponse:
    return extract_medicine_caution_tags()
