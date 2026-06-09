from app.core.config import settings
from app.services.chatbot.llm_answer_service import get_llm_client, normalize_answer_text


def generate_consultation_summary(chat_log: str) -> str:
    cleaned_chat_log = (chat_log or "").strip()
    if not cleaned_chat_log:
        return "상담 내용을 찾지 못했습니다."

    client = get_llm_client()
    system_prompt = (
        settings.llm_system_prompt
        + " 당신은 약사 상담 내용을 요약하는 도우미입니다."
        + " 답변은 한국어로 작성하세요."
        + " 제공된 상담 대화 내용만 바탕으로 요약하세요."
        + " 추측하거나 없는 내용을 보태지 마세요."
        + " 요약은 3~5문장으로 자연스럽게 작성하세요."
        + " 환자의 주요 질문, 약사의 핵심 안내, 복용 시 주의점이 있으면 포함하세요."
        + " 마크다운 문법이나 제목, 번호 목록은 쓰지 마세요."
    )
    user_prompt = f"다음 약사 상담 대화를 짧고 자연스럽게 요약해 주세요.\n\n상담 대화:\n{cleaned_chat_log}"

    response = client.chat.completions.create(
        model=settings.llm_model or "gpt-4.1-mini",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        timeout=settings.llm_timeout_seconds,
    )

    answer = response.choices[0].message.content or ""
    normalized = normalize_answer_text(answer)
    return normalized or "상담 요약을 생성하지 못했습니다."
