from fastapi import APIRouter

from app.schemas.chatbot import AiChatBotRequest, AiChatBotResponse
from app.services.llm_client import build_user_prompt, request_chat_completion

router = APIRouter()


@router.post("/chat", response_model=AiChatBotResponse)
def send_chat(request: AiChatBotRequest) -> AiChatBotResponse:
    user_prompt = build_user_prompt(
        message=request.message,
        normalized_message=request.normalizedMessage,
        extracted_names=request.extractedNames,
        request_slots=request.requestSlots,
        request_details=request.requestDetails,
        medicine_context=request.medicineContext,
    )
    answer = request_chat_completion(user_prompt)
    return AiChatBotResponse(answer=answer)
