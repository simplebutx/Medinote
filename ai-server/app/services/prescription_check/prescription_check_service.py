from app.schemas.prescription_analysis import (
    PrescriptionAnalysisItem,
    PrescriptionAnalysisKeywordGroup,
    PrescriptionAnalysisRequest,
    PrescriptionAnalysisResponse,
)
from app.services.chatbot.document_search_service import (
    ensure_qdrant_collection,
    get_qdrant_client,
)
from app.core.config import settings


def analyze_prescription_cautions(
    request: PrescriptionAnalysisRequest,
) -> PrescriptionAnalysisResponse:
    items: list[PrescriptionAnalysisItem] = []

    for medicine in request.medicines:
        matched_health_infos = _find_matched_labels(
            medicine.medicineName,
            request.healthInfos,
        )
        matched_diseases = _find_matched_labels(
            medicine.medicineName,
            request.diseases,
        )
        items.append(
            PrescriptionAnalysisItem(
                scheduleMedicineId=medicine.scheduleMedicineId,
                medicineName=medicine.medicineName,
                matchedHealthInfoNames=matched_health_infos,
                matchedDiseaseNames=matched_diseases,
            )
        )

    return PrescriptionAnalysisResponse(items=items)


def _find_matched_labels(
    medicine_name: str,
    keyword_groups: list[PrescriptionAnalysisKeywordGroup],
) -> list[str]:
    matched_labels: list[str] = []
    document_text = _load_medicine_document_text(medicine_name)
    if not document_text:
        return matched_labels

    for group in keyword_groups:
        if not group.label or not group.keywords:
            continue

        if _contains_any_keyword(document_text, group.keywords):
            matched_labels.append(group.label)

    return _dedupe_preserve_order(matched_labels)


def _load_medicine_document_text(medicine_name: str) -> str:
    client = get_qdrant_client()
    ensure_qdrant_collection(client)
    points, _ = client.scroll(
        collection_name=settings.qdrant_collection_name,
        limit=1000,
        with_payload=True,
        with_vectors=False,
    )
    normalized_medicine_name = _normalize_text(medicine_name)
    candidates = [
        point
        for point in points
        if _normalize_text(str((point.payload or {}).get("drug_name", ""))) == normalized_medicine_name
    ]
    return "\n".join(
        _normalize_text(str((point.payload or {}).get("text", "")))
        for point in candidates
    )


def _contains_any_keyword(text: str, keywords: list[str]) -> bool:
    return any(
        _normalize_text(keyword) in text
        for keyword in keywords
        if _normalize_text(keyword)
    )


def _normalize_text(value: str) -> str:
    return value.replace("\x00", "").replace(" ", "").lower()


def _dedupe_preserve_order(values: list[str]) -> list[str]:
    seen = set()
    deduped: list[str] = []

    for value in values:
        if value in seen:
            continue
        seen.add(value)
        deduped.append(value)

    return deduped
