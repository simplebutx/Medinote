import math
import re
from collections.abc import Iterable

from qdrant_client import QdrantClient
from qdrant_client.models import FieldCondition, Filter, MatchAny, PointStruct

from app.core.config import settings
from app.services.chatbot.embedding_service import embed_text, embed_texts

# 검색 키워드에서 제외할 일반 단어
STOPWORDS = {"이거","그거","이약","약","의약품","뭐","무엇","어떻게","왜","언제","해요","돼요""알려줘","좀",}

# 키워드 뒤에 붙은 조사/어미 제거용
TRAILING_PARTICLES = ("으로는","에서는","에게는","한테는","과는","와는","에서","에게","한테","으로","까지",
    "부터", "처럼","라도","이라","라면","이면","이다","입니다","인가","인가요","나요","네요","겠죠","해야",
    "해요","은","는","이","가","을","를","에","도","만","과","와",)

SEMANTIC_TOKEN_MIN_LENGTH = 2  # semantic 비교 후보로 볼 최소 단어 길이
SEMANTIC_SIMILARITY_THRESHOLD = 0.55  # 유사도 제한 점수
SEMANTIC_TOP_K_PER_KEYWORD = 5  # 키워드당 확장 단어 최대 개수
VECTOR_FALLBACK_LIMIT = 3  # 다 실패 시 벡터 검색 개수
CHUNK_MAX_LENGTH = 1200
CHUNK_CONTINUATION_THRESHOLD = 0.9
QUERY_SYNONYMS: dict[str, tuple[str, ...]] = {
    "임산부": ("임산부", "임부",),"임신부": ("임신부", "임부",),"임신중": ("임부",),
    "수유부": ("수유", "모유수유"),
    "어린이": ("소아",),
    "노인": ("고령자",),"고령": ("고령자",),
    "술": ("술", "음주", "알코올"),
    "담배": ("담배", "흡연",),
    "같이먹어도돼": ("병용", "상호작용"),
    "같이먹어도되나": ("병용", "상호작용"),
    "같이먹어도되는지": ("병용", "상호작용"),
}


def get_qdrant_client() -> QdrantClient:
    return QdrantClient(url=settings.qdrant_url)


# 검색 메인 함수
def search_relevant_documents(text: str, drug_names: list[str] | None, debug_info: dict | None = None,) -> list[dict]:
    client = get_qdrant_client()
    query_filter = build_drug_name_filter(drug_names)

    if drug_names:
        candidates = fetch_candidate_points(client, query_filter)   # 약 이름 필터에 맞는 청크를 qdrant에서 전부 가져옴
        query_keywords = extract_query_keywords(text, drug_names)   # 질문에서 핵심 검색 키워드 추출
        semantic_keyword_map = build_semantic_keyword_map(query_keywords, candidates, drug_names)  # 질문 키워드와 비슷한 문서 내부 단어를 semantic 확장어로 수집
        query_vector = embed_text(text)

        if debug_info is not None:
            debug_info["query_keywords"] = query_keywords
            debug_info["semantic_keyword_map"] = semantic_keyword_map
            debug_info["semantic_keywords"] = flatten_semantic_keyword_map(semantic_keyword_map)

        # 후보 청크에 exact/semantic/vector 점수를 매기고 정렬
        ranked_candidates = rank_candidate_points(
            candidates=candidates,
            query_vector=query_vector,
            query_keywords=query_keywords,
            semantic_keyword_map=semantic_keyword_map,
        )

        # 최종 반환 청크 선정
        relevant_matches = [
            item
            for item in ranked_candidates
            if item["exact_score"] > 0 or item["semantic_score"] > 0
        ]
        if relevant_matches:
            return attach_chunk_continuations(relevant_matches, candidates)

    # exact/semantic으로 못 잡았을 때만 질문 전체 벡터로 fallback
    query_vector = embed_text(text)
    vector_results = client.search(
        collection_name=settings.qdrant_collection_name,
        query_vector=query_vector,
        query_filter=query_filter,
        limit=VECTOR_FALLBACK_LIMIT,
    )

    if debug_info is not None:
        debug_info.setdefault("query_keywords", extract_query_keywords(text, drug_names))
        debug_info.setdefault("semantic_keyword_map", {})
        debug_info.setdefault("semantic_keywords", [])

    return [
        {
            "id": point.id,
            "score": point.score,
            "payload": point.payload,
            "exact_score": 0,
            "semantic_score": 0,
            "matched_keywords": [],
            "matched_semantic_keywords": [],
        }
        for point in vector_results
    ]


# 디버깅용 키워드 정보만 확인
def inspect_search_keywords(text: str, drug_names: list[str] | None) -> dict:
    debug_info: dict = {}
    search_relevant_documents(text, drug_names, debug_info=debug_info)
    return debug_info

# ================Qdrant에서 후보 청크 가져오기=======================

# drug_name 기준 필터 생성
def build_drug_name_filter(drug_names: list[str] | None) -> Filter | None:
    if not drug_names:
        return None

    return Filter(
        must=[
            FieldCondition(
                key="drug_name",
                match=MatchAny(any=drug_names),
            )
        ]
    )


# 약 이름 필터에 맞는 청크를 qdrant에서 전부 가져옴
def fetch_candidate_points(client: QdrantClient, query_filter: Filter | None) -> list:
    points = []
    offset = None

    while True:
        batch, offset = client.scroll(
            collection_name=settings.qdrant_collection_name,
            scroll_filter=query_filter,
            limit=100,
            offset=offset,
            with_payload=True,
            with_vectors=True,
        )
        points.extend(batch)

        if offset is None:
            break

    return points


# ================사용자 질문에서 검색 키워드 추출=======================

# 질문에서 핵심 검색 키워드 추출
def extract_query_keywords(text: str, drug_names: list[str] | None = None) -> list[str]:
    normalized = text.lower().strip()
    raw_tokens = re.findall(r"[가-힣a-zA-Z0-9]+", normalized)
    drug_name_tokens = extract_drug_name_tokens(drug_names)  # 약 이름 자체는 검색 키워드에서 제외
    keywords = []
    for token in raw_tokens:
        for compact in build_query_keyword_variants(token):   # 원형 토큰과 조사 제거형을 둘 다 후보로 둠
            if not compact:
                continue
            if compact in STOPWORDS:
                continue
            if len(compact) <= 1:
                continue
            if compact in drug_name_tokens:
                continue
            keywords.append(compact)
            keywords.extend(expand_query_synonyms(compact))

    return dedupe_preserve_order(keywords)


# 원형 토큰과 조사 제거형을 둘 다 후보로 둠
def build_query_keyword_variants(token: str) -> list[str]:
    original = token.replace(" ", "")
    normalized = normalize_query_token(token)

    variants = []
    if original:
        variants.append(original)
    if normalized and normalized != original:
        variants.append(normalized)

    return dedupe_preserve_order(variants)


def expand_query_synonyms(keyword: str) -> list[str]:
    return list(QUERY_SYNONYMS.get(keyword, ()))


# 토큰 뒤에 붙은 조사/어미 제거
def normalize_query_token(token: str) -> str:
    compact = token.replace(" ", "")

    for suffix in TRAILING_PARTICLES:
        if compact.endswith(suffix) and len(compact) > len(suffix) + 1:
            compact = compact[: -len(suffix)]
            break

    return compact


# 약 이름 자체는 검색 키워드에서 제외
def extract_drug_name_tokens(drug_names: list[str] | None) -> set[str]:
    tokens: set[str] = set()

    for name in drug_names or []:
        normalized_name = name.lower().strip()
        if not normalized_name:
            continue

        tokens.add(normalized_name.replace(" ", ""))
        tokens.update(
            token.replace(" ", "")
            for token in re.findall(r"[가-힣a-zA-Z0-9]+", normalized_name)
            if token.strip()
        )

    return tokens


# ================질문 키워드와 비슷한 문서 단어 찾는 단계======================

# 질문 키워드와 비슷한 문서 내부 단어를 semantic 확장어로 수집
def build_semantic_keyword_map(
    query_keywords: list[str],
    candidates: list,
    drug_names: list[str] | None,
) -> dict[str, list[dict]]:
    if not query_keywords or not candidates:
        return {}

    candidate_tokens = build_candidate_tokens(candidates, drug_names)
    if not candidate_tokens:
        return {}

    candidate_token_list = sorted(candidate_tokens)
    embeddings = embed_texts(query_keywords + candidate_token_list)
    query_embeddings = embeddings[: len(query_keywords)]
    candidate_embeddings = embeddings[len(query_keywords) :]

    semantic_keyword_map: dict[str, list[dict]] = {}
    for keyword, keyword_embedding in zip(query_keywords, query_embeddings, strict=True):
        scored_tokens = []

        for candidate_token, candidate_embedding in zip(
            candidate_token_list,
            candidate_embeddings,
            strict=True,
        ):
            similarity = cosine_similarity(keyword_embedding, candidate_embedding)
            if similarity < SEMANTIC_SIMILARITY_THRESHOLD:
                continue

            scored_tokens.append(
                {
                    "token": candidate_token,
                    "similarity": similarity,
                }
            )

        scored_tokens.sort(key=lambda item: item["similarity"], reverse=True)
        semantic_keyword_map[keyword] = scored_tokens[:SEMANTIC_TOP_K_PER_KEYWORD]

    return semantic_keyword_map


# 후보 청크 내부에서 semantic 비교 대상으로 쓸 단어 추출
def build_candidate_tokens(candidates: list, drug_names: list[str] | None) -> set[str]:
    tokens: set[str] = set()
    drug_name_tokens = extract_drug_name_tokens(drug_names)

    for point in candidates:
        payload = point.payload or {}
        text = str(payload.get("text", "")).lower()
        raw_tokens = re.findall(r"[가-힣a-zA-Z0-9]+", text)

        for token in raw_tokens:
            compact = normalize_query_token(token)
            if not compact:
                continue
            if len(compact) < SEMANTIC_TOKEN_MIN_LENGTH:
                continue
            if compact in STOPWORDS:
                continue
            if compact in drug_name_tokens:
                continue
            tokens.add(compact)

    return tokens


# 키워드별 semantic 확장 결과를 단순 리스트로 변환
def flatten_semantic_keyword_map(semantic_keyword_map: dict[str, list[dict]]) -> list[str]:
    expanded_keywords: list[str] = []

    for items in semantic_keyword_map.values():
        expanded_keywords.extend(item["token"] for item in items)

    return dedupe_preserve_order(expanded_keywords)


# 두 벡터가 얼마나 비슷한지 계산
def cosine_similarity(left: list[float], right: list[float] | None) -> float:
    if not right:
        return 0.0

    dot_product = sum(left_value * right_value for left_value, right_value in zip(left, right, strict=True))
    left_norm = math.sqrt(sum(value * value for value in left))
    right_norm = math.sqrt(sum(value * value for value in right))

    if left_norm == 0 or right_norm == 0:
        return 0.0

    return dot_product / (left_norm * right_norm)


# ================점수화/결과 정리======================

# 후보 청크에 exact/semantic/vector 점수를 매기고 정렬
def rank_candidate_points(
    candidates: list,
    query_vector: list[float],
    query_keywords: list[str],
    semantic_keyword_map: dict[str, list[dict]],
) -> list[dict]:
    ranked = []
    semantic_keywords = set(flatten_semantic_keyword_map(semantic_keyword_map))

    for point in candidates:
        payload = point.payload or {}
        normalized_text = str(payload.get("text", "")).replace(" ", "").lower()
        matched_keywords = [
            keyword for keyword in query_keywords if keyword and keyword in normalized_text
        ]
        matched_semantic_keywords = [
            keyword
            for keyword in semantic_keywords
            if keyword and keyword in normalized_text and keyword not in matched_keywords
        ]
        vector_score = cosine_similarity(query_vector, point.vector)

        ranked.append(
            {
                "id": point.id,
                "score": vector_score,
                "payload": payload,
                "exact_score": len(matched_keywords),
                "semantic_score": len(matched_semantic_keywords),
                "matched_keywords": matched_keywords,
                "matched_semantic_keywords": matched_semantic_keywords,
            }
        )

    ranked.sort(
        key=lambda item: (item["exact_score"], item["semantic_score"], item["score"]),
        reverse=True,
    )

    return ranked


# 청크 길이가 최대 길이에 가까우면 다음 청크를 이어붙인 context_text를 같이 만든다
def attach_chunk_continuations(results: list[dict], candidates: list) -> list[dict]:
    indexed_candidates = {}

    for point in candidates:
        payload = point.payload or {}
        drug_name = payload.get("drug_name")
        document_type = payload.get("document_type")
        chunk_index = payload.get("chunk_index")

        if drug_name is None or document_type is None or chunk_index is None:
            continue

        indexed_candidates[(drug_name, document_type, chunk_index)] = payload

    enriched_results = []
    consumed_next_chunks: set[tuple[str, str, int]] = set()

    for result in results:
        payload = result.get("payload", {}) or {}
        result_key = (
            payload.get("drug_name"),
            payload.get("document_type"),
            payload.get("chunk_index"),
        )

        if result_key in consumed_next_chunks:
            continue

        base_text = str(payload.get("text", "")).strip()
        context_text = base_text

        if len(base_text) >= int(CHUNK_MAX_LENGTH * CHUNK_CONTINUATION_THRESHOLD):
            next_chunk_key = (
                payload.get("drug_name"),
                payload.get("document_type"),
                payload.get("chunk_index", -1) + 1,
            )
            next_payload = indexed_candidates.get(next_chunk_key)

            if next_payload:
                next_text = str(next_payload.get("text", "")).strip()
                if next_text:
                    context_text = f"{base_text}\n{next_text}"
                    consumed_next_chunks.add(next_chunk_key)

        enriched_result = dict(result)
        enriched_result["context_text"] = context_text
        enriched_results.append(enriched_result)

    return enriched_results


# 중복 제거 + 기존 순서 유지
def dedupe_preserve_order(values: Iterable[str]) -> list[str]:
    seen = set()
    deduped = []

    for value in values:
        if value in seen:
            continue
        seen.add(value)
        deduped.append(value)

    return deduped