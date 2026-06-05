from fastapi import APIRouter

from app.schemas.chatbot import AiChatBotRequest, AiChatBotResponse
from app.services.chatbot_service import generate_chatbot_answer

router = APIRouter()


@router.post("/chat", response_model=AiChatBotResponse)
def send_chat(request: AiChatBotRequest) -> AiChatBotResponse:
    return generate_chatbot_answer(request)
