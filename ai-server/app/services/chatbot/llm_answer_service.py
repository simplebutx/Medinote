from dataclasses import dataclass

from openai import OpenAI

from app.core.config import settings

MAX_CONTEXT_CHUNKS = 6
MAX_CONTEXT_CHARS = 7000
ANSWER_TYPE_NORMAL = "NORMAL"
ANSWER_TYPE_FALLBACK = "FALLBACK"
DRUG_INFO_FALLBACK_ANSWER = "답변드리기 어렵습니다. 자세한 내용은 약사 상담으로 이어갈 수 있습니다."


@dataclass(frozen=True)
class LlmAnswerResult:
    answer: str
    answer_type: str = ANSWER_TYPE_NORMAL


@dataclass(frozen=True)
class LlmContext:
    prompt_input: str
    has_grounded_match: bool


def get_llm_client() -> OpenAI:
    if settings.llm_api_url:
        base_url = settings.llm_api_url.rstrip("/")
        for suffix in ("/chat/completions", "/completions", "/responses"):
            if base_url.endswith(suffix):
                base_url = base_url[: -len(suffix)]
                break
        return OpenAI(api_key=settings.llm_api_key, base_url=base_url)
    return OpenAI(api_key=settings.llm_api_key)


# 약정보 프롬프트
def build_drug_info_system_prompt() -> str:
    return (
        settings.llm_system_prompt
        + " 답변은 한국어로 작성하세요."
        + " 제공된 약 문서 근거만 사용해서 답하세요."
        + " 문서에 근거가 없으면 추측하지 말고 확인이 어렵다고 말하세요."
        + " 답변은 1~4문장으로 짧고 자연스럽게 정리하세요."
        + " '주의:' 같은 소제목은 쓰지 마세요."
        + " 마크다운 문법은 쓰지 마세요."
        + " 약 이름은 답변 본문에서 반복하지 말고 바로 설명부터 시작하세요."
        + " 검색 상태가 fallback_only면 첫 문장은 반드시 '답변드리기 어렵습니다.'로 시작하세요."
    )


# 스케쥴 프롬프트
def build_schedule_system_prompt() -> str:
    return (
        settings.llm_system_prompt
        + " 답변은 한국어로 작성하세요."
        + " 제공된 복약 일정 DB 컨텍스트만 사용해서 답하세요."
        + " DB 컨텍스트에 없는 정보는 추측하지 마세요."
        + " '답변드리기 어렵습니다.'라는 문구는 쓰지 마세요."
        + " raw 데이터나 표처럼 나열하지 말고, 사람이 읽기 쉬운 자연어로 풀어서 설명하세요."
        + " 가능하면 '현재 복용 중인 약', '복용 일정', '최근 복용 기록'처럼 핵심만 묶어서 설명하세요."
        + " 시간, 날짜, 약 이름이 보이면 그대로 활용하되 불필요하게 모두 반복하지 말고 중요한 내용만 요약하세요."
        + " 번호 목록보다는 짧은 문단이나 자연스러운 문장 위주로 설명하세요."
        + " 답변은 2~5문장 정도로 정리하세요."
        + " 마크다운 문법은 쓰지 마세요."
    )

# llm한테 보낼 컨텍스트 빌드 (results: Qdrant에서 검색해온 약 문서 청크 목록)
def build_llm_context(question: str,results: list[dict],drug_name: str | None = None,schedule_context: str = "", ) -> LlmContext:
    context_blocks: list[str] = []
    total_chars = 0
    has_grounded_match = False  # Qdrant에서 찾아온것이 근거가 있는가 

    # ============= drug_info ================
    # 검색결과 청크들을 하나씩 돌면서, LLM에 넣을 본문 텍스트 꺼내서 하나의 블록으로 
    for index, result in enumerate(results, start=1):
        payload = result.get("payload", {})
        text = str(result.get("context_text") or payload.get("text", "")).strip()
        if not text:
            continue

        exact_score = int(result.get("exact_score", 0) or 0)
        semantic_score = int(result.get("semantic_score", 0) or 0)
        if exact_score > 0 or semantic_score > 0:
            has_grounded_match = True

        block = "\n".join(
            [
                f"[근거 {index}]",
                f"document_type={payload.get('document_type', 'unknown')}",
                f"chunk_index={payload.get('chunk_index', 0)}",
                f"exact_score={exact_score}",
                f"semantic_score={semantic_score}",
                f"text={text}",
            ]
        )

        if total_chars + len(block) > MAX_CONTEXT_CHARS and context_blocks:
            break

        context_blocks.append(block)
        total_chars += len(block)

        if len(context_blocks) >= MAX_CONTEXT_CHUNKS:
            break

    if has_grounded_match:
        search_state = "grounded_match_found"
    elif schedule_context.strip():
        search_state = "schedule_context_only"
    else:
        search_state = "fallback_only"

    prompt_lines: list[str] = []
    if drug_name:
        prompt_lines.append(f"약 이름: {drug_name}")

    prompt_lines.extend(
        [
            f"사용자 질문: {question}",
            f"검색 상태: {search_state}",
            "약 문서 근거:",
            "\n\n".join(context_blocks) if context_blocks else "(근거 없음)",
        ]
    )

    # ============= schedule ================
    if schedule_context.strip():
        prompt_lines.extend(["", "복약 일정 DB 컨텍스트:", schedule_context.strip()])

    return LlmContext(
        prompt_input="\n".join(prompt_lines),
        has_grounded_match=has_grounded_match,
    )  # 리턴값: LLM에게 보낼 프롬프트 본문 문자열 + 약 문서 근거 여부

# llm에게 답변 요청
def generate_answer_from_context(question: str,results: list[dict],drug_name: str | None = None, schedule_context: str = "",) -> LlmAnswerResult:
    llm_context = build_llm_context(
        question=question,
        results=results,
        drug_name=drug_name,
        schedule_context=schedule_context,
    )

    # 스케줄 컨텍스트도 없고 약문서 근거도 없으면 fallback
    if not schedule_context.strip() and not llm_context.has_grounded_match:
        return LlmAnswerResult(
            answer=DRUG_INFO_FALLBACK_ANSWER,
            answer_type=ANSWER_TYPE_FALLBACK,
        )

    client = get_llm_client()

    # 규칙 프롬프트 (스케줄vs약정보) 
    system_prompt = (
        build_schedule_system_prompt()  # 스케줄 프롬프트
        if schedule_context.strip() and not results
        else build_drug_info_system_prompt()  # 약정보 프롬프트
    )

    # 요청
    response = client.chat.completions.create(
        model=settings.llm_model or "gpt-4.1-mini",
        temperature=0.2,
        messages=[
            {"role": "system", "content": system_prompt},  # 규칙 프롬프트
            {"role": "user", "content": llm_context.prompt_input},   # 질문 및 컨텍스트
        ],
        timeout=settings.llm_timeout_seconds,
    )

    # 응답
    answer = normalize_answer_text(response.choices[0].message.content or "")  # 답변 전처리
    # llm 답변이 있을 때
    if answer:
        return LlmAnswerResult(answer=answer)

    # llm 답변이 비어있을때 
    if schedule_context.strip():
        return LlmAnswerResult(answer="현재 등록된 복약 일정 정보를 바탕으로 답변을 정리하지 못했어요. 다시 질문해 주세요.")

    return LlmAnswerResult(
        answer=DRUG_INFO_FALLBACK_ANSWER,
        answer_type=ANSWER_TYPE_FALLBACK,
    )


def normalize_answer_text(answer: str) -> str:
    normalized = answer.strip().replace("\r\n", "\n")
    normalized = normalized.replace("주의:", "").replace("참고:", "")
    while "\n\n\n" in normalized:
        normalized = normalized.replace("\n\n\n", "\n\n")
    return normalized.strip()
