import { consultationInstance } from "../../../api/axiosInstance";
import type {
  ChatbotMessage,
  ChatbotRoom,
  CreateChatbotRoomRequest,
  SendChatbotMessageRequest,
  SendChatbotMessageResponse,
  UpdateChatbotRoomRequest,
} from "../types/chat.types";

export const createChatbotRoom = async (
  body?: CreateChatbotRoomRequest
) => {
  const response = await consultationInstance.post<ChatbotRoom>(
    "/api/chatbot/rooms",
    body ?? {}
  );

  return response.data;
};

export const getChatbotRooms = async () => {
  const response = await consultationInstance.get<ChatbotRoom[]>(
    "/api/chatbot/rooms"
  );

  return response.data;
};

export const getChatbotRoom = async (roomId: number) => {
  const response = await consultationInstance.get<ChatbotRoom>(
    `/api/chatbot/rooms/${roomId}`
  );

  return response.data;
};

export const updateChatbotRoom = async (
  roomId: number,
  body: UpdateChatbotRoomRequest
) => {
  const response = await consultationInstance.patch<ChatbotRoom>(
    `/api/chatbot/rooms/${roomId}`,
    body
  );

  return response.data;
};

export const deleteChatbotRoom = async (roomId: number) => {
  await consultationInstance.delete(`/api/chatbot/rooms/${roomId}`);
};

export const getChatbotRoomMessages = async (roomId: number) => {
  const response = await consultationInstance.get<ChatbotMessage[]>(
    `/api/chatbot/rooms/${roomId}/messages`
  );

  return response.data;
};

export const sendChatbotMessage = async (
  body: SendChatbotMessageRequest
) => {
  const response = await consultationInstance.post<SendChatbotMessageResponse>(
    "/api/chatbot/message",
    body
  );

  return response.data;
};

export const deleteChatbotMessage = async (messageId: number) => {
  await consultationInstance.delete(`/api/chatbot/messages/${messageId}`);
};