import { useMutation } from "@tanstack/react-query";
import { sendChatbotMessage } from "../api/chat.api";

export const useSendChatbotMessage = () => {
  return useMutation({
    mutationFn: sendChatbotMessage,
  });
};