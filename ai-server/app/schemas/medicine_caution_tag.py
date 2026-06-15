from pydantic import BaseModel, Field


class MedicineCautionTag(BaseModel):
    tagCode: str
    tagName: str
    matchedKeywords: list[str] = Field(default_factory=list)


class MedicineCautionTagItem(BaseModel):
    medicineName: str
    tags: list[MedicineCautionTag] = Field(default_factory=list)


class MedicineCautionTagExtractResponse(BaseModel):
    items: list[MedicineCautionTagItem] = Field(default_factory=list)
