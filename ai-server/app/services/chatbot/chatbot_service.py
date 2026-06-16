import logging

from app.schemas.chatbot import AiChatBotRequest, AiChatBotResponse
from app.services.chatbot.document_search_service import search_relevant_documents
from app.services.chatbot.llm_classify_chatbot_intent import classify_chatbot_intent
from app.services.chatbot.llm_answer_service import (
    ANSWER_TYPE_CONSULT_RECOMMENDED,
    ANSWER_TYPE_FALLBACK,
    ANSWER_TYPE_NORMAL,
    generate_answer_from_context,
)

logger = logging.getLogger(__name__)


def generate_chatbot_answer(request: AiChatBotRequest) -> AiChatBotResponse:
    raw_text = request.message
    drug_names = request.extractedNames
    question_type = request.questionType
    schedule_context = (request.scheduleContext or "").strip()

    # ================= question_type == unknown ================
    if question_type == "unknown":
        classified_intent = classify_chatbot_intent(raw_text)  # 질문의도 판별기에 보내기
        logger.info(
            "classified unknown chatbot question: intent=%s question=%s",
            classified_intent,
            raw_text,
        )

        # 스케쥴 관련인지 확인
        if classified_intent == "schedule":
            return AiChatBotResponse(
                answer="복약 일정 관련 질문으로 보여요. 오늘 먹을 약, 다음 복용 시간, 복용 기록처럼 조금 더 구체적으로 질문해 주세요.",
                answerType=ANSWER_TYPE_FALLBACK,
            )

        # 나머지 
        return AiChatBotResponse(
            answer="저는 약 정보와 복약 일정 관련 질문만 도와드릴 수 있어요. 약 정보 질문은 약 이름을 @로 선택해서 함께 보내 주세요.",
            answerType=ANSWER_TYPE_FALLBACK,
        )

    # ================= question_type == schedule ================
    if question_type == "schedule":
        if not schedule_context:
            return AiChatBotResponse(
                answer="현재 등록된 복약 일정 정보를 찾지 못했습니다. 일정 등록 상태를 확인한 뒤 다시 질문해 주세요.",
                answerType=ANSWER_TYPE_FALLBACK,
            )

        log_schedule_debug(raw_text=raw_text, schedule_context=schedule_context)
        
        # 스케쥴 최종 결과
        answer_result = generate_answer_from_context(
            question=raw_text,
            results=[],
            schedule_context=schedule_context,
        )
        return AiChatBotResponse(answer=answer_result.answer, answerType=answer_result.answer_type)
    
    # ============= question_type = drug_info =======================

    if not drug_names:
        return AiChatBotResponse(
            answer="약 정보 질문은 약 이름을 @로 선택해서 함께 보내 주세요.",
            answerType=ANSWER_TYPE_FALLBACK,
        )

    answers: list[str] = []
    answer_type = ANSWER_TYPE_NORMAL

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
        answer_result = generate_answer_from_context(
            question=raw_text,
            results=results,
            drug_name=drug_name,
        )
        # llm 답변
        answer = answer_result.answer

        # 문서에서 못찾은 경우
        if answer_result.answer_type == ANSWER_TYPE_CONSULT_RECOMMENDED:
            answer_type = ANSWER_TYPE_CONSULT_RECOMMENDED
        elif answer_result.answer_type == ANSWER_TYPE_FALLBACK and answer_type != ANSWER_TYPE_CONSULT_RECOMMENDED:
            answer_type = ANSWER_TYPE_FALLBACK

        # 출처가 있으면 출처 표시
        source_text = format_sources(results)
        if answer_result.answer_type == ANSWER_TYPE_NORMAL and source_text:
            answers.append(f"{answer}\n\n출처: {source_text}")
        else:
            answers.append(answer)

    return AiChatBotResponse(answer="\n\n".join(answers), answerType=answer_type)


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
