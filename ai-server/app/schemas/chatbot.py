from pydantic import BaseModel, Field
# DTO
# BaseModel: JSON <-> 파이썬 객체

class AiChatBotRequest(BaseModel):
    message: str = Field(..., description="Original user message")
    normalizedMessage: str = Field(..., description="Preprocessed user message")
    extractedNames: list[str] = Field(default_factory=list)
    userId: int | None = Field(default=None, description="Authenticated user id")
    questionType: str = Field(default="drug_info", description="drug_info or schedule")
    scheduleContext: str = Field(default="", description="Schedule context built by Spring")


class AiChatBotResponse(BaseModel):
    answer: str
