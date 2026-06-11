import { useQuery } from "@tanstack/react-query";
import { getChatbotRooms } from "../api/chat.api";

export const useChatbotRooms = () => {
  return useQuery({
    queryKey: ["chatbot-rooms"],
    queryFn: getChatbotRooms,
  });
};