from app.schemas.chatbot import AiChatBotRequest, AiChatBotResponse
from app.services.vector_store import search_relevant_documents


def generate_chatbot_answer(request: AiChatBotRequest) -> AiChatBotResponse:

    # 요청 데이터에서 원본 질문, 전처리 질문, 추출된 약 이름을 꺼냄 (약이름으로 문서 검색 필터링, 전처리는 나중에 단순 분기용)
    raw_text = request.message
    drug_names = request.extractedNames

    lines = []

    if not drug_names:
        results = search_relevant_documents(raw_text, None)
        return AiChatBotResponse(answer=str(results))

    # 벡터 DB에서 관련 문서 검색 (약별로)
    for drug_name in drug_names:
        results = search_relevant_documents(raw_text, drug_names)

        lines.append(f"=== {drug_name} ===")
        for index, result in enumerate(results, start=1):
            payload = result.get("payload", {})
            drug_name = payload.get("drug_name", "알 수 없는 약")
            document_type = payload.get("document_type", "unknown")
            chunk_index = payload.get("chunk_index", 0)
            score = result.get("score", 0.0)

            lines.append(
                f"[{index}] | document_type={document_type} | chunk_index={chunk_index} | score={score:.4f}"
            )

    # 4. 검색 결과를 정리해 LLM 입력용 컨텍스트 생성
    # 5. LLM 호출 후 답변 반환

    return AiChatBotResponse(answer="\n\n".join(lines))
