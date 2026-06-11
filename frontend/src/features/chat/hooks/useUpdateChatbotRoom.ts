import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateChatbotRoom } from "../api/chat.api";
import type { UpdateChatbotRoomRequest } from "../types/chat.types";

interface UpdateChatbotRoomParams {
  roomId: number;
  body: UpdateChatbotRoomRequest;
}

export const useUpdateChatbotRoom = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ roomId, body }: UpdateChatbotRoomParams) =>
      updateChatbotRoom(roomId, body),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["chatbot-rooms"] });
      queryClient.invalidateQueries({
        queryKey: ["chatbot-room", variables.roomId],
      });
    },
  });
};