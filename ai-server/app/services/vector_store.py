from qdrant_client import QdrantClient
from qdrant_client.models import PointStruct  # PointStruct: Qdrant에 넣을 데이터 1건의 형식 (포인트 한개)
from qdrant_client.models import FieldCondition, Filter, MatchAny, MatchValue  # 검색 필터 조건 모델

from app.core.config import settings
from app.services.embedding_service import embed_text

# Qdrant에 요청 보낼 클라이언트 객체 (db연결용)
def get_qdrant_client() -> QdrantClient:
    return QdrantClient(url=settings.qdrant_url)


# 테스트: 업서트
def upsert_test_point():
    client = get_qdrant_client()
    text = "타이레놀은 해열 및 진통에 사용된다."
    vector = embed_text(text)  # 저장할 텍스트를 임베딩

    client.upsert(
        collection_name=settings.qdrant_collection_name,
        points=[
            PointStruct(
                id=1,
                vector=vector,
                payload={
                    "drug_name": "타이레놀",
                    "source": "manual_test",
                    "text": text,
                    "chunk_index": 0,
                },
            )
        ],
    )

    return {"message": "test point inserted"}

# 검색
def search_relevant_documents(text: str, drug_names: str | None) -> list[dict]:
    client = get_qdrant_client()

    query_vector = embed_text(text)  # 질문 원본을 임베딩
    # inferred_document_type = infer_document_type(text)

    must_conditions = []

    # 검색 필터 정의
    if drug_names:
        must_conditions.append(
            FieldCondition(
                key="drug_name",
                match=MatchAny(any=drug_names),   # drug_name이 리스트에 하나라도 있으면 검색 대상에 포함
            )
        )

    # if inferred_document_type:
    #     must_conditions.append(
    #         FieldCondition(
    #             key="document_type",
    #             match=MatchValue(value=inferred_document_type),   # document-type을 분류한 값인거로 
    #         )
    #     )

    query_filter = Filter(must=must_conditions) if must_conditions else None

    results = client.search(
        collection_name=settings.qdrant_collection_name,
        query_vector=query_vector,
        query_filter=query_filter,
        limit=3,
    )

    return [
        {
            "id": point.id,
            "score": point.score,
            "payload": point.payload,
        }
        for point in results
    ]

# 키워드로 문서 타입 추정
# def infer_document_type(text: str) -> str | None:
#     normalized = text.replace(" ", "")

#     efficacy_keywords = ["효능", "효과", "어디에", "무슨약", "무슨 약"]
#     usage_keywords = ["복용", "복용법", "용법", "용량", "식후", "식전", "언제먹", "어떻게먹"]
#     precaution_keywords = ["주의", "주의사항", "부작용", "상호작용", "같이먹", "금기", "경고"]

#     if any(keyword in normalized for keyword in efficacy_keywords):
#         return "efficacy"

#     if any(keyword in normalized for keyword in usage_keywords):
#         return "usage"

#     if any(keyword in normalized for keyword in precaution_keywords):
#         return "precaution"

#     return None