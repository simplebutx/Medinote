import { consultationInstance } from "../../../api/axiosInstance";
import type {
  SendChatbotMessageRequest,
  SendChatbotMessageResponse,
} from "../types/chat.types";

export const sendChatbotMessage = async (
  body: SendChatbotMessageRequest
) => {
  const response = await consultationInstance.post<SendChatbotMessageResponse>(
    "/api/chatbot/message",
    body
  );

  return response.data;
};