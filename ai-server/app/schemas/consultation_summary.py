from pydantic import BaseModel, Field


class AiConsultationSummaryRequest(BaseModel):
    roomId: int | None = Field(default=None, description="Consultation room id")
    chatLog: str = Field(..., description="Full consultation chat log")


class AiConsultationSummaryResponse(BaseModel):
    summary: str
