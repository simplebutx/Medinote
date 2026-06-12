import json
import logging
import re

from app.core.config import settings
from app.services.chatbot.llm_answer_service import get_llm_client

logger = logging.getLogger(__name__)

# 질문의도가 unknown일때 schedule인지 한번더 확인하고, 관련없는 질문 fallback 주기 위함
VALID_INTENTS = {"schedule", "other"}

def classify_chatbot_intent(question: str) -> str:  # 리턴값: schedule/other
    cleaned_question = (question or "").strip()
    if not cleaned_question:
        return "other"

    client = get_llm_client()
    system_prompt = """
너는 사용자의 질문이 복약 일정 관련 질문인지 분류한다.

분류 기준:
- schedule: 사용자의 등록된 복약 일정, 복용 기록, 현재 복용 중인 약, 다음 복용 시간, 오늘 먹어야 할 약, 복약 체크에 대한 질문
- other: 복약 일정과 직접 관련 없는 질문

판단 규칙:
- 사용자의 개인 복약 상태, 일정, 기록, 체크 여부를 묻는 질문이면 schedule
- 특정 약의 효능, 부작용, 복용법, 주의사항 등 약 자체에 대한 질문은 other
- 약이나 복약 일정과 무관한 질문은 other

반드시 JSON만 반환한다:
{"intent":"schedule|other"}
""".strip()
    
    # llm에게 보낼 프롬프트 안에 들어갈 사용자 질문
    user_prompt = f"사용자 질문: {cleaned_question}"

    try:
        response = client.chat.completions.create(
            model=settings.llm_model or "gpt-4.1-mini",
            temperature=0,
            messages=[
                {"role": "system", "content": system_prompt},  # 규칙 프롬프트
                {"role": "user", "content": user_prompt},  # 사용자 질문 
            ],
            timeout=settings.llm_timeout_seconds,
        )

        content = (response.choices[0].message.content or "").strip()
        parsed = json.loads(extract_json_object(content))
        intent = str(parsed.get("intent", "")).strip().lower()

        if intent in VALID_INTENTS:
            return intent

        logger.warning("Invalid chatbot intent returned: %s", content)
        return "other"
    except Exception:
        logger.exception("Failed to classify chatbot intent")
        return "other"


def extract_json_object(content: str) -> str:
    if content.startswith("{") and content.endswith("}"):
        return content

    match = re.search(r"\{.*\}", content, flags=re.DOTALL)
    if match:
        return match.group(0)

    return "{}"
