import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteChatbotRoom } from '../api/chat.api';

export const useDeleteChatbotRoom = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteChatbotRoom,
    onSuccess: (_data, roomId) => {
      queryClient.invalidateQueries({ queryKey: ['chatbot-rooms'] });

      queryClient.removeQueries({
        queryKey: ['chatbot-messages', roomId],
      });
    },
  });
};