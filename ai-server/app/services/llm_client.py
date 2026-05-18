import requests
from fastapi import HTTPException

from app.core.config import settings


def build_user_prompt(
    *,
    message: str,
    normalized_message: str,
    extracted_names: list[str],
    request_slots: list[str],
    request_details: list[str],
    medicine_context: str,
) -> str:
    return (
        f"사용자 원본 질문:\n{message}\n\n"
        f"정규화된 질문:\n{normalized_message}\n\n"
        f"추출된 약 이름:\n{extracted_names}\n\n"
        f"의도 슬롯:\n{request_slots}\n\n"
        f"세부 요청:\n{request_details}\n\n"
        f"DB 조회 결과:\n{medicine_context}\n\n"
        "위 정보를 바탕으로 사용자에게 자연스럽고 이해하기 쉬운 한국어로 답변하세요. "
        "DB 조회 결과에 없는 내용은 추측하지 마세요."
    )


def request_chat_completion(user_prompt: str) -> str:
    if not settings.llm_api_url:
        raise HTTPException(status_code=500, detail="LLM_API_URL is not configured.")
    if not settings.llm_api_key:
        raise HTTPException(status_code=500, detail="LLM_API_KEY is not configured.")
    if not settings.llm_model:
        raise HTTPException(status_code=500, detail="LLM_MODEL is not configured.")

    headers = {
        "Authorization": f"Bearer {settings.llm_api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": settings.llm_model,
        "messages": [
            {"role": "system", "content": settings.llm_system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.2,
    }

    try:
        response = requests.post(
            settings.llm_api_url,
            headers=headers,
            json=payload,
            timeout=settings.llm_timeout_seconds,
        )
        response.raise_for_status()
    except requests.RequestException as exc:
        raise HTTPException(status_code=502, detail=f"Failed to call LLM API: {exc}") from exc

    data = response.json()

    try:
        return data["choices"][0]["message"]["content"].strip()
    except (KeyError, IndexError, TypeError, AttributeError) as exc:
        raise HTTPException(
            status_code=502,
            detail="LLM API response format was not recognized.",
        ) from exc
