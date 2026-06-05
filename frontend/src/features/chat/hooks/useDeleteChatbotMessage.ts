import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteChatbotMessage } from "../api/chat.api";

interface DeleteChatbotMessageParams {
  messageId: number;
  roomId: number;
}

export const useDeleteChatbotMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ messageId }: DeleteChatbotMessageParams) =>
      deleteChatbotMessage(messageId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["chatbot-messages", variables.roomId],
      });
    },
  });
};