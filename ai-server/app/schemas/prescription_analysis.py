from pydantic import BaseModel, Field


class PrescriptionAnalysisMedicine(BaseModel):
    scheduleMedicineId: int | None = Field(None, description="schedule medicine row id")
    medicineId: int | None = Field(None, description="medicine item sequence")
    medicineName: str = Field(..., description="medicine name used for RAG drug filter")


class PrescriptionAnalysisKeywordGroup(BaseModel):
    label: str = Field(..., description="display label returned when matched")
    keywords: list[str] = Field(default_factory=list, description="search keywords for this label")


class PrescriptionAnalysisRequest(BaseModel):
    userId: int | None = None
    scheduleId: int | None = None
    medicines: list[PrescriptionAnalysisMedicine] = Field(default_factory=list)
    healthInfos: list[PrescriptionAnalysisKeywordGroup] = Field(default_factory=list)
    diseases: list[PrescriptionAnalysisKeywordGroup] = Field(default_factory=list)


class PrescriptionAnalysisItem(BaseModel):
    scheduleMedicineId: int | None = None
    medicineName: str
    matchedHealthInfoNames: list[str] = Field(default_factory=list)
    matchedDiseaseNames: list[str] = Field(default_factory=list)


class PrescriptionAnalysisResponse(BaseModel):
    items: list[PrescriptionAnalysisItem] = Field(default_factory=list)
