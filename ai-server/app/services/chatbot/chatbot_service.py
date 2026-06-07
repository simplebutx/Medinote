import logging

from app.schemas.chatbot import AiChatBotRequest, AiChatBotResponse
from app.services.chatbot.document_search_service import search_relevant_documents
from app.services.chatbot.llm_answer_service import generate_answer_from_context

logger = logging.getLogger(__name__)


def generate_chatbot_answer(request: AiChatBotRequest) -> AiChatBotResponse:
    raw_text = request.message
    drug_names = request.extractedNames
    question_type = request.questionType or "drug_info"
    schedule_context = (request.scheduleContext or "").strip()

    # 스케쥴 관련 질문이면
    if question_type == "schedule":
        if not schedule_context:
            return AiChatBotResponse(
                answer="현재 등록된 복약 일정 정보를 찾지 못했습니다. 일정 등록 상태를 확인한 뒤 다시 질문해 주세요."
            )

        log_schedule_debug(raw_text=raw_text, schedule_context=schedule_context)
        answer = generate_answer_from_context(
            question=raw_text,
            results=[],
            schedule_context=schedule_context,
        )
        return AiChatBotResponse(answer=answer)

    if not drug_names:
        return AiChatBotResponse(
            answer="질문 내용을 조금 더 구체적으로 적어 주세요. 약 이름이나 복약 정보를 함께 알려주시면 더 정확하게 도와드릴 수 있어요."
        )

    answers: list[str] = []

    for drug_name in drug_names:
        debug_info: dict = {}
        # 관련 문서 청크 찾기
        results = search_relevant_documents(raw_text, [drug_name], debug_info=debug_info)

        log_search_debug(
            drug_name=drug_name,
            raw_text=raw_text,
            debug_info=debug_info,
            results=results,
        )

        # llm 한테 보낼 컨텍스트
        answer = generate_answer_from_context(
            question=raw_text,
            results=results,
            drug_name=drug_name,
        )
        # 출처가 있으면 출처 표시
        source_text = format_sources(results)
        if source_text and should_append_source(answer):
            answers.append(f"{answer}\n\n출처: {source_text}")
        else:
            answers.append(answer)

    return AiChatBotResponse(answer="\n\n".join(answers))


def log_search_debug(
    drug_name: str,
    raw_text: str,
    debug_info: dict,
    results: list[dict],
) -> None:
    lines = [
        "[chatbot-search-debug]",
        f"drug_name={drug_name}",
        f"question={raw_text}",
        f"query_keywords={debug_info.get('query_keywords', [])}",
        f"semantic_keywords={debug_info.get('semantic_keywords', [])}",
        f"semantic_keyword_map={debug_info.get('semantic_keyword_map', {})}",
    ]

    for index, result in enumerate(results, start=1):
        payload = result.get("payload", {})
        text_content = str(result.get("context_text") or payload.get("text", "")).strip()
        lines.append("------------")
        lines.append(
            f"[{index}] drug_name={payload.get('drug_name', 'unknown')} "
            f"document_type={payload.get('document_type', 'unknown')} "
            f"chunk_index={payload.get('chunk_index', 0)} "
            f"score={float(result.get('score', 0.0)):.4f}"
        )
        lines.append(
            f"exact_score={int(result.get('exact_score', 0) or 0)} "
            f"matched_keywords={result.get('matched_keywords', [])}"
        )
        lines.append(
            f"semantic_score={int(result.get('semantic_score', 0) or 0)} "
            f"matched_semantic_keywords={result.get('matched_semantic_keywords', [])}"
        )
        lines.append(f"text={text_content}")

    logger.warning("\n".join(lines))


def log_schedule_debug(raw_text: str, schedule_context: str) -> None:
    logger.warning(
        "\n".join(
            [
                "[chatbot-schedule-debug]",
                f"question={raw_text}",
                schedule_context,
            ]
        )
    )


# 출처 붙일지 판별
def should_append_source(answer: str) -> bool:
    lowered = answer.lower()
    impossible_markers = [
        "답변드리기 어렵습니다",
    ]
    return not any(marker in lowered for marker in impossible_markers)


# 출처 문구 정리
def format_sources(results: list[dict]) -> str:
    source_labels: list[str] = []

    for result in results:
        payload = result.get("payload", {})
        source_url = str(payload.get("source_url", "")).strip()
        if not source_url:
            continue

        if "nedrug.mfds.go.kr" in source_url:
            label = "의약품안전나라(MFDS)"
        else:
            label = source_url

        if label not in source_labels:
            source_labels.append(label)

    return ", ".join(source_labels)
