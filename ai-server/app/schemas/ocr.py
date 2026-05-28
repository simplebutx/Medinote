from pydantic import BaseModel, Field


class AiOcrRequest(BaseModel):
    ocrResultId: int = Field(..., description="ocr_result table row id")
    userId: int = Field(..., description="Uploader user id")
    imageKey: str = Field(..., description="S3 object key for the uploaded prescription image")


class AiOcrResponse(BaseModel):
    rawText: str = Field(..., description="OCR extracted raw text")
    resultJson: str = Field(..., description="Structured OCR result serialized as JSON string")
    ocrEngine: str = Field(..., description="OCR engine identifier")
    preprocessedImageDataUrl: str | None = Field(
        default=None,
        description="Previewable data URL for the preprocessed image used for OCR",
    )
