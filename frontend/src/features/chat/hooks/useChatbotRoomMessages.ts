import { useQuery } from "@tanstack/react-query";
import { getChatbotRoomMessages } from "../api/chat.api";

export const useChatbotRoomMessages = (roomId: number | null) => {
  return useQuery({
    queryKey: ["chatbot-messages", roomId],
    queryFn: () => getChatbotRoomMessages(roomId as number),
    enabled: roomId !== null,
  });
};