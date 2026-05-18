from pydantic import BaseModel, Field
# DTO
# BaseModel: JSON <-> 파이썬 객체 변환시 기준이 되는 스키마

class AiChatBotRequest(BaseModel):
    message: str = Field(..., description="Original user message")
    normalizedMessage: str = Field(..., description="Preprocessed user message")
    extractedNames: list[str] = Field(default_factory=list)
    requestSlots: list[str] = Field(default_factory=list)
    requestDetails: list[str] = Field(default_factory=list)
    medicineContext: str = Field(..., description="Database lookup result")


class AiChatBotResponse(BaseModel):
    answer: str
