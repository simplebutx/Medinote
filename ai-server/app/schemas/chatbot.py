from pydantic import BaseModel, Field
# DTO
# BaseModel: JSON <-> 파이썬 객체

class AiChatBotRequest(BaseModel):
    message: str = Field(..., description="Original user message")
    normalizedMessage: str = Field(..., description="Preprocessed user message")
    extractedNames: list[str] = Field(default_factory=list)


class AiChatBotResponse(BaseModel):
    answer: str
