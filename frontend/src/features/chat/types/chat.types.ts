export type ChatbotSenderType = "USER" | "BOT";

export interface ChatbotRoom {
  roomId: number;
  userId?: number | null;
  title: string;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface CreateChatbotRoomRequest {
  title?: string | null;
}

export interface UpdateChatbotRoomRequest {
  title: string;
}

export interface SendChatbotMessageRequest {
  roomId: number;
  message: string;
}

export interface ChatbotMessage {
  messageId?: number | null;
  answer?: string | null;
  roomId?: number | null;
  senderType?: ChatbotSenderType | string | null;
  content?: string | null;
  createdAt?: string | null;
}

export type SendChatbotMessageResponse = ChatbotMessage;