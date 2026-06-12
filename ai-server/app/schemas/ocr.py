from pydantic import BaseModel, Field


class AiOcrRequest(BaseModel):
    ocrResultId: int = Field(..., description="ocr_result table row id")
    userId: int = Field(..., description="Uploader user id")
    imageKey: str = Field(..., description="S3 object key for the uploaded prescription image")


class AiOcrResponse(BaseModel):
    resultJson: str = Field(..., description="최종 답변")

