import { useMutation, useQueryClient } from "@tanstack/react-query";
import { sendChatbotMessage } from "../api/chat.api";

export const useSendChatbotMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: sendChatbotMessage,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["chatbot-messages", variables.roomId],
      });
      queryClient.invalidateQueries({ queryKey: ["chatbot-rooms"] });
    },
  });
};