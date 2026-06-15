from collections import defaultdict

from app.core.config import settings
from app.schemas.medicine_caution_tag import (
    MedicineCautionTag,
    MedicineCautionTagExtractResponse,
    MedicineCautionTagItem,
)
from app.services.chatbot.document_search_service import ensure_qdrant_collection, get_qdrant_client


TAG_DEFINITIONS: tuple[dict, ...] = (
    {
        "code": "DROWSINESS",
        "name": "졸음 주의",
        "keywords": ("졸음", "졸리", "어지러움", "어지러", "현기증", "집중력"),
    },
    {
        "code": "DRIVING",
        "name": "운전 주의",
        "keywords": ("운전", "기계조작", "기계 조작", "위험한 기계"),
    },
    {
        "code": "ALCOHOL",
        "name": "음주 주의",
        "keywords": ("음주", "술", "알코올"),
    },
    {
        "code": "GASTROINTESTINAL",
        "name": "위장장애 주의",
        "keywords": ("위장장애", "속쓰림", "속 쓰림", "구역", "구토", "복통", "위통"),
    },
    {
        "code": "BLEEDING",
        "name": "출혈 주의",
        "keywords": ("출혈", "멍", "혈변", "토혈", "코피"),
    },
    {
        "code": "LIVER",
        "name": "간기능 주의",
        "keywords": ("간손상", "간 손상", "간장애", "간 장애", "간질환", "간 질환"),
    },
    {
        "code": "KIDNEY",
        "name": "신장기능 주의",
        "keywords": ("신기능", "신 기능", "신장애", "신 장애", "신장질환", "신장 질환"),
    },
    {
        "code": "PHOTOSENSITIVITY",
        "name": "햇빛 주의",
        "keywords": ("햇빛", "자외선", "광과민", "일광"),
    },
    {
        "code": "STOPPING",
        "name": "임의중단 주의",
        "keywords": ("임의로 중단", "갑자기 중단", "중단하지", "복용을 중단"),
    },
)


def extract_medicine_caution_tags() -> MedicineCautionTagExtractResponse:
    client = get_qdrant_client()
    ensure_qdrant_collection(client)
    points, _ = client.scroll(
        collection_name=settings.qdrant_collection_name,
        limit=1000,
        with_payload=True,
        with_vectors=False,
    )

    text_by_medicine: dict[str, list[str]] = defaultdict(list)
    for point in points:
        payload = point.payload or {}
        medicine_name = str(payload.get("drug_name", "")).strip()
        if not medicine_name:
            continue
        text_by_medicine[medicine_name].append(_normalize_text(str(payload.get("text", ""))))

    items = []
    for medicine_name, texts in sorted(text_by_medicine.items()):
        document_text = "\n".join(texts)
        tags = _match_tags(document_text)
        items.append(MedicineCautionTagItem(medicineName=medicine_name, tags=tags))

    return MedicineCautionTagExtractResponse(items=items)


def _match_tags(document_text: str) -> list[MedicineCautionTag]:
    tags = []
    for definition in TAG_DEFINITIONS:
        matched_keywords = [
            keyword
            for keyword in definition["keywords"]
            if _normalize_text(keyword) in document_text
        ]
        if not matched_keywords:
            continue
        tags.append(
            MedicineCautionTag(
                tagCode=definition["code"],
                tagName=definition["name"],
                matchedKeywords=matched_keywords,
            )
        )
    return tags


def _normalize_text(value: str) -> str:
    return value.replace("\x00", "").replace(" ", "").lower()
