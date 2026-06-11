import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createChatbotRoom } from "../api/chat.api";
import type { CreateChatbotRoomRequest } from "../types/chat.types";

export const useCreateChatbotRoom = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body?: CreateChatbotRoomRequest) => createChatbotRoom(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chatbot-rooms"] });
    },
  });
};