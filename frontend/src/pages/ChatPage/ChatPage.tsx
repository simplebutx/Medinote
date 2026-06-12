import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Badge, Button, Card, Input } from '../../components/ui';
import {
  useChatbotRoomMessages,
  useChatbotRooms,
  useCreateChatbotRoom,
  useDeleteChatbotMessage,
  useDeleteChatbotRoom,
  useSendChatbotMessage,
  useUpdateChatbotRoom,
} from '../../features/chat/hooks';
import {
  useCloseConsultRoom,
  useConsultMessages,
  useConsultSocket,
  useCreateConsultRoom,
  useGenerateConsultSummary,
  useMyConsultRooms,
  useSubmitConsultFeedback,
} from '../../features/consult/hooks';
import type { ChatbotMessage as ApiChatbotMessage } from '../../features/chat/types/chat.types';
import type { ConsultSocketMessage } from '../../features/consult/types';
import { useMedicineSuggest } from '../../features/drug/hooks';
import { useDebounce } from '../../hooks/useDebounce';

type ChatMode = 'ai' | 'pharmacist';
type MessageSender = 'USER' | 'AI' | 'PHARMACIST' | 'SYSTEM';

interface DrugOption {
  id: number;
  name: string;
  ingredient: string;
  type: '일반의약품' | '전문의약품';
}

interface ChatMessage {
  id: number;
  apiMessageId?: number | null;
  sender: MessageSender;
  content: string;
  createdAt: string;
  sortTime?: number;
  drugs?: DrugOption[];

  answerType?: string;
  escalationDraft?: string;
  escalationDrugs?: DrugOption[];
}

const initialAiMessages: ChatMessage[] = [
  {
    id: 1,
    sender: 'AI',
    content:
      '복용 중인 약 정보와 복약 일정에 대해 궁금한 점을 물어보세요.\n응급 증상, 심각한 부작용, 과다 복용이 의심된다면 AI 답변을 기다리지 말고 즉시 의료기관 또는 119에 도움을 요청해주세요.',
    createdAt: '09:00',
    sortTime: 0,
  },
];

const PHARMACIST_DRAFT_STORAGE_KEY = 'pendingPharmacistConsultQuestion';
const PHARMACIST_GUIDE_MESSAGE =
  '입력하신 내용은 전문가의 확인이 필요해요. 약사 상담을 통해 확인해주세요.';
const PENDING_CONSULT_MESSAGE_LIMIT = 2;

interface PharmacistDraftStorageValue {
  draft: string;
  drugs: DrugOption[];
}

const initialPharmacistMessages: ChatMessage[] = [
  {
    id: 1,
    sender: 'PHARMACIST',
    content:
      '안녕하세요. 약사 상담입니다. 복용 중인 약과 증상을 함께 알려주시면 확인해드릴게요.',
    createdAt: '09:05',
    sortTime: 0,
  },
];

function getSenderLabel(sender: MessageSender) {
  if (sender === 'USER') return '나';
  if (sender === 'AI') return 'AI';
  if (sender === 'PHARMACIST') return '약사';
  return '시스템';
}

function getSenderBadge(sender: MessageSender) {
  if (sender === 'USER') return 'blue';
  if (sender === 'AI') return 'green';
  if (sender === 'PHARMACIST') return 'yellow';
  return 'gray';
}

function getDrugOptionId(name: string) {
  return name.split('').reduce((hash, char) => {
    return hash + char.charCodeAt(0);
  }, 0);
}

function formatChatTime(createdAt?: string | null) {
  if (!createdAt) {
    return '방금';
  }

  return createdAt.slice(11, 16);
}

function getMessageSortTime(createdAt?: string | null) {
  if (!createdAt) {
    return 0;
  }

  const time = new Date(createdAt).getTime();

  if (Number.isNaN(time)) {
    return 0;
  }

  return time;
}

function getChatMessageSortTime(message: ChatMessage) {
  if (
    typeof message.sortTime === 'number' &&
    Number.isFinite(message.sortTime)
  ) {
    return message.sortTime;
  }

  const parsedTime = new Date(message.createdAt).getTime();

  if (!Number.isNaN(parsedTime)) {
    return parsedTime;
  }

  const clockMatch = /^(\d{1,2}):(\d{2})$/.exec(message.createdAt);

  if (clockMatch) {
    const hours = Number(clockMatch[1]);
    const minutes = Number(clockMatch[2]);

    return (hours * 60 + minutes) * 60 * 1000;
  }

  return 0;
}

function sortChatMessagesByTime(messages: ChatMessage[]) {
  return [...messages].sort((a, b) => {
    const timeDifference = getChatMessageSortTime(a) - getChatMessageSortTime(b);

    if (timeDifference !== 0) {
      return timeDifference;
    }

    return a.id - b.id;
  });
}

function getConsultRoomStatusLabel(status?: string) {
  if (status === 'PENDING') return '약사 매칭 대기 중';
  if (status === 'MATCHED' || status === 'ACTIVE') return '약사와 상담 중';
  if (status === 'COMPLETED' || status === 'CLOSED') return '상담 종료';

  return '상담방 없음';
}

function getConsultRoomStatusDescription(status?: string) {
  if (status === 'PENDING') {
    return '상담 요청이 접수되었습니다. 약사가 수락하면 상담을 이어갈 수 있습니다.';
  }

  if (status === 'MATCHED' || status === 'ACTIVE') {
    return '약사가 상담을 수락했습니다. 이제 상담 내용을 주고받을 수 있습니다.';
  }

  if (status === 'COMPLETED' || status === 'CLOSED') {
    return '상담이 종료되었습니다. 필요한 경우 새 상담 요청을 생성해주세요.';
  }

  return '약사 상담이 필요한 경우 상담 요청을 생성해주세요.';
}

function mapApiChatbotMessageToChatMessage(
  message: ApiChatbotMessage,
  index: number,
): ChatMessage {
  const isFallback = message.answerType === 'FALLBACK';

  return {
    id: message.messageId ?? index + 1,
    apiMessageId: message.messageId ?? null,
    sender: message.senderType === 'USER' ? 'USER' : 'AI',
    content: isFallback
      ? PHARMACIST_GUIDE_MESSAGE
      : message.content ??
        message.answer ??
        '메시지 내용을 불러오지 못했습니다.',
    createdAt: formatChatTime(message.createdAt),
    sortTime: getMessageSortTime(message.createdAt),
    answerType: message.answerType,
  };
}

function mapConsultMessageToChatMessage(
  message: {
    messageId?: number;
    senderType: 'USER' | 'PHARMACIST';
    message?: string;
    content?: string;
    createdAt?: string;
  },
  index: number,
): ChatMessage {
  return {
    id: message.messageId ?? index + 1,
    sender: message.senderType,
    content:
      message.content ??
      message.message ??
      '메시지 내용을 불러오지 못했습니다.',
    createdAt: formatChatTime(message.createdAt),
    sortTime: getMessageSortTime(message.createdAt),
  };
}

function mapSocketMessageToChatMessage(
  message: ConsultSocketMessage,
  id: number,
): ChatMessage {
  return {
    id,
    sender: message.senderType,
    content: message.message,
    createdAt: '방금',
  };
}

function buildConsultMessageText(text: string, drugs: DrugOption[]) {
  const trimmedText = text.trim();

  if (drugs.length === 0) {
    return trimmedText;
  }

  let questionText = trimmedText;

  drugs.forEach((drug) => {
    questionText = questionText.replaceAll(`@${drug.name}`, '');
    questionText = questionText.replaceAll(drug.name, '');
  });

  questionText = questionText
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const drugText = drugs
    .map((drug) => {
      return `- ${drug.name}${drug.ingredient ? ` / 성분: ${drug.ingredient}` : ''}`;
    })
    .join('\n');

  if (!questionText) {
    return `선택한 약에 대해 상담하고 싶어요.\n\n[선택한 약]\n${drugText}`;
  }

  return `${questionText}\n\n[선택한 약]\n${drugText}`;
}

function buildChatbotMessageText(text: string, drugs: DrugOption[]) {
  const trimmedText = text.trim();

  if (drugs.length === 0) {
    return trimmedText;
  }

  let questionText = trimmedText;

  drugs.forEach((drug) => {
    questionText = questionText.replaceAll(`@${drug.name}`, '');
  });

  questionText = questionText.replace(/\s+/g, ' ').trim();

  const drugMentionText = drugs
    .map((drug) => {
      return `@${drug.name}`;
    })
    .join('\n');

  if (!questionText) {
    return drugMentionText;
  }

  return `${questionText}\n\n${drugMentionText}`;
}

function buildChatbotDisplayText(text: string, drugs: DrugOption[]) {
  let displayText = text.trim();

  drugs.forEach((drug) => {
    displayText = displayText.replaceAll(`@${drug.name}`, '');
  });

  return displayText.replace(/\s+/g, ' ').trim();
}

function buildPharmacistDraftText(question: string, drugs: DrugOption[]) {
  const displayQuestion = buildChatbotDisplayText(question, drugs);

  const drugMentionText = drugs.map((drug) => `@${drug.name}`).join(' ');

  if (drugMentionText && displayQuestion) {
    return `${drugMentionText} ${displayQuestion}`;
  }

  if (drugMentionText) {
    return drugMentionText;
  }

  return question.trim();
}

function getPreviousUserMessage(messages: ChatMessage[], currentIndex: number) {
  for (let index = currentIndex - 1; index >= 0; index -= 1) {
    const message = messages[index];

    if (message.sender === 'USER') {
      return message;
    }
  }

  return null;
}

function removeDuplicateChatMessages(messages: ChatMessage[]) {
  const seen = new Set<string>();

  return messages.filter((message) => {
    /**
     * 서버 저장 메시지는 apiMessageId 기준으로만 중복 제거
     */
    if (message.apiMessageId) {
      const key = `api-${message.apiMessageId}`;

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    }

    /**
     * 로컬 메시지는 id 기준으로만 중복 제거
     * 같은 내용의 질문/답변이 반복되어도 별도 메시지로 보여야 함
     */
    const key = `local-${message.id}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function getChatDisplayParts(chat: ChatMessage) {
  if (chat.sender !== 'USER') {
    return {
      drugNames: [],
      content: chat.content,
    };
  }

  const drugNamesFromState = chat.drugs?.map((drug) => drug.name) ?? [];

  const drugNamesFromMention = Array.from(chat.content.matchAll(/@([^\n]+)/g))
    .map((match) => match[1]?.trim())
    .filter(Boolean) as string[];

  const drugNamesFromConsultBlock = Array.from(
    chat.content.matchAll(/^- (.+?)(?: \/ 성분:.*)?$/gm),
  )
    .map((match) => match[1]?.trim())
    .filter(Boolean) as string[];

  const drugNames = Array.from(
    new Set([
      ...drugNamesFromState,
      ...drugNamesFromMention,
      ...drugNamesFromConsultBlock,
    ]),
  );

  let displayContent = chat.content;

  drugNames.forEach((drugName) => {
    displayContent = displayContent.replaceAll(`@${drugName}`, '');
    displayContent = displayContent.replaceAll(`- ${drugName}`, '');
    displayContent = displayContent.replaceAll(drugName, '');
  });

  displayContent = displayContent
    .replace(/\[선택한 약\]/g, '')
    .replace(/^- .*$/gm, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return {
    drugNames,
    content: displayContent,
  };
}

function ChatPage() {
  const messageIdRef = useRef(100);
  const chatMessagesContainerRef = useRef<HTMLDivElement | null>(null);

  const [activeMode, setActiveMode] = useState<ChatMode>('ai');
  const [selectedConsultRoomId, setSelectedConsultRoomId] = useState<
    number | null
  >(null);

  const [consultSocketMessages, setConsultSocketMessages] = useState<
    ChatMessage[]
  >([]);

  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [locallyClosedConsultRoomIds, setLocallyClosedConsultRoomIds] =
    useState<number[]>([]);

  const createMessageId = () => {
    messageIdRef.current += 1;
    return messageIdRef.current;
  };

  const sendChatbotMessageMutation = useSendChatbotMessage();
  const createConsultRoomMutation = useCreateConsultRoom();

  const closeConsultRoomMutation = useCloseConsultRoom();
  const submitConsultFeedbackMutation = useSubmitConsultFeedback();

  const generateConsultSummaryMutation = useGenerateConsultSummary();

  const { data: myConsultRooms = [], isLoading: isMyConsultRoomsLoading } =
    useMyConsultRooms(activeMode === 'pharmacist');

  const { data: chatbotRooms = [], isLoading: isChatbotRoomsLoading } =
    useChatbotRooms();

  const createChatbotRoomMutation = useCreateChatbotRoom();

  const deleteChatbotMessageMutation = useDeleteChatbotMessage();

  const updateChatbotRoomMutation = useUpdateChatbotRoom();
  const deleteChatbotRoomMutation = useDeleteChatbotRoom();

  const [editingRoomId, setEditingRoomId] = useState<number | null>(null);
  const [editingRoomTitle, setEditingRoomTitle] = useState('');

  const [selectedChatbotRoomId, setSelectedChatbotRoomId] = useState<
    number | null
  >(null);

  const activeChatbotRoomId = selectedChatbotRoomId;

  const {
    data: chatbotRoomMessages = [],
    isLoading: isChatbotRoomMessagesLoading,
  } = useChatbotRoomMessages(activeChatbotRoomId);

  const ensureChatbotRoomId = async () => {
    if (selectedChatbotRoomId) {
      return selectedChatbotRoomId;
    }

    const firstRoomId = chatbotRooms[0]?.roomId;

    if (firstRoomId) {
      setSelectedChatbotRoomId(firstRoomId);
      return firstRoomId;
    }

    const createdRoom = await createChatbotRoomMutation.mutateAsync({
      title: '새 대화',
    });

    setSelectedChatbotRoomId(createdRoom.roomId);

    return createdRoom.roomId;
  };

  const handleCreateChatbotRoom = async () => {
    try {
      const createdRoom = await createChatbotRoomMutation.mutateAsync({
        title: '새 대화',
      });

      setSelectedChatbotRoomId(createdRoom.roomId);

      setAiMessagesByRoomId((prev) => ({
        ...prev,
        [createdRoom.roomId]: initialAiMessages,
      }));
    } catch (error) {
      console.error('챗봇 대화방 생성 실패:', error);
    }
  };

  const handleSelectChatbotRoom = (roomId: number) => {
    setSelectedChatbotRoomId(roomId);
    setEditingRoomId(null);
    setEditingRoomTitle('');
  };

  const handleStartEditRoomTitle = (roomId: number, title: string) => {
    setEditingRoomId(roomId);
    setEditingRoomTitle(title);
  };

  const handleCancelEditRoomTitle = () => {
    setEditingRoomId(null);
    setEditingRoomTitle('');
  };

  const handleSaveRoomTitle = (roomId: number) => {
    const nextTitle = editingRoomTitle.trim();

    if (!nextTitle) {
      return;
    }

    updateChatbotRoomMutation.mutate(
      {
        roomId,
        body: {
          title: nextTitle,
        },
      },
      {
        onSuccess: () => {
          setEditingRoomId(null);
          setEditingRoomTitle('');
        },
        onError: (error) => {
          console.error('챗봇 대화방 이름 수정 실패:', error);
        },
      },
    );
  };

  const handleDeleteChatbotRoom = (roomId: number) => {
    const isConfirmed = window.confirm(
      '이 대화방을 삭제하시겠습니까?\n삭제하면 이 방의 메시지도 함께 삭제됩니다.',
    );

    if (!isConfirmed) {
      return;
    }

    const nextRoomId =
      chatbotRooms.find((room) => room.roomId !== roomId)?.roomId ?? null;

    if (selectedChatbotRoomId === roomId) {
      setSelectedChatbotRoomId(nextRoomId);
    }

    setAiMessagesByRoomId((prev) => {
      const next = { ...prev };
      delete next[roomId];
      return next;
    });

    deleteChatbotRoomMutation.mutate(roomId, {
      onSuccess: () => {
        setEditingRoomId(null);
        setEditingRoomTitle('');
      },
      onError: (error) => {
        console.error('챗봇 대화방 삭제 실패:', error);
      },
    });
  };

  const handleDeleteChatbotMessage = (chat: ChatMessage) => {
    if (!chat.apiMessageId || !activeChatbotRoomId) {
      return;
    }

    const isConfirmed = window.confirm('이 메시지를 삭제하시겠습니까?');

    if (!isConfirmed) {
      return;
    }

    deleteChatbotMessageMutation.mutate(
      {
        messageId: chat.apiMessageId,
        roomId: activeChatbotRoomId,
      },
      {
        onError: (error) => {
          console.error('챗봇 메시지 삭제 실패:', error);
        },
      },
    );
  };

  const [aiMessagesByRoomId, setAiMessagesByRoomId] = useState<
    Record<number, ChatMessage[]>
  >({});

  const [pharmacistMessages, setPharmacistMessages] = useState<ChatMessage[]>(
    initialPharmacistMessages,
  );

  const [message, setMessage] = useState('');
  const [selectedDrugs, setSelectedDrugs] = useState<DrugOption[]>([]);
  const [isDrugSearchOpen, setIsDrugSearchOpen] = useState(false);

  const serverAiMessages = useMemo(() => {
    return chatbotRoomMessages.map(mapApiChatbotMessageToChatMessage);
  }, [chatbotRoomMessages]);

  const localAiMessages = useMemo(() => {
    if (!activeChatbotRoomId) {
      return [];
    }

    return aiMessagesByRoomId[activeChatbotRoomId] ?? [];
  }, [activeChatbotRoomId, aiMessagesByRoomId]);

  const mergedAiMessages = useMemo(() => {
    return sortChatMessagesByTime(
      removeDuplicateChatMessages([
        ...serverAiMessages,
        ...localAiMessages,
      ]),
    );
  }, [localAiMessages, serverAiMessages]);

  useEffect(() => {
    if (!activeChatbotRoomId || serverAiMessages.length === 0) {
      return;
    }

    setAiMessagesByRoomId((prev) => {
      const currentMessages = prev[activeChatbotRoomId] ?? [];

      const messagesToKeep = currentMessages.filter((chat) => {
        if (chat.sender === 'SYSTEM') {
          return true;
        }

        // messageId가 없는 AI 응답은 서버에 저장되지 않은 임시 응답이므로 유지
        if (chat.sender === 'AI' && !chat.apiMessageId) {
          return true;
        }

        return false;
      });

      if (messagesToKeep.length === currentMessages.length) {
        return prev;
      }

      return {
        ...prev,
        [activeChatbotRoomId]: messagesToKeep,
      };
    });
  }, [activeChatbotRoomId, serverAiMessages.length]);

  const drugSearchKeyword = useMemo(() => {
    const match = message.match(/@([^\s@]*)$/);

    if (!match) {
      return '';
    }

    return match[1].trim();
  }, [message]);

  const activeConsultRooms = myConsultRooms
    .filter((room) => {
      return (
        room.status === 'PENDING' ||
        room.status === 'MATCHED' ||
        room.status === 'ACTIVE'
      );
    })
    .sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const completedConsultRooms = myConsultRooms
    .filter((room) => {
      return room.status === 'COMPLETED' || room.status === 'CLOSED';
    })
    .sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const allConsultRooms = [...activeConsultRooms, ...completedConsultRooms];

  const activeConsultRoom =
    allConsultRooms.find((room) => room.roomId === selectedConsultRoomId) ??
    activeConsultRooms[0] ??
    completedConsultRooms[0] ??
    null;

  const { data: consultRoomMessages = [] } = useConsultMessages(
    activeMode === 'pharmacist' ? activeConsultRoom?.roomId : null,
  );

  const serverConsultMessages = useMemo(() => {
    return consultRoomMessages.map(mapConsultMessageToChatMessage);
  }, [consultRoomMessages]);

  const activeMessages: ChatMessage[] =
    activeMode === 'ai'
      ? activeChatbotRoomId
        ? mergedAiMessages.length > 0
          ? mergedAiMessages
          : initialAiMessages
        : initialAiMessages
      : serverConsultMessages.length > 0 || consultSocketMessages.length > 0
        ? removeDuplicateChatMessages([
            ...serverConsultMessages,
            ...consultSocketMessages,
          ]).sort((a, b) => {
            return (a.sortTime ?? 0) - (b.sortTime ?? 0);
          })
        : pharmacistMessages;

  const lastActiveMessageKey =
    activeMessages.length > 0
      ? `${activeMessages[activeMessages.length - 1].id}-${
          activeMessages[activeMessages.length - 1].content
        }`
      : '';

  useEffect(() => {
    const container = chatMessagesContainerRef.current;

    if (!container) {
      return;
    }

    window.requestAnimationFrame(() => {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth',
      });
    });
  }, [activeMode, lastActiveMessageKey, sendChatbotMessageMutation.isPending]);

  const handleReceiveConsultMessage = useCallback(
    (socketMessage: ConsultSocketMessage) => {
      if (socketMessage.type !== 'TALK') {
        return;
      }

      // 사용자가 보낸 메시지는 전송 직후 optimistic append로 이미 표시함
      if (socketMessage.senderType === 'USER') {
        return;
      }

      setConsultSocketMessages((prev) => [
        ...prev,
        mapSocketMessageToChatMessage(socketMessage, createMessageId()),
      ]);
    },
    [],
  );

  const isConsultRoomMatched =
    activeConsultRoom?.status === 'MATCHED' ||
    activeConsultRoom?.status === 'ACTIVE';

  const isConsultRoomPending = activeConsultRoom?.status === 'PENDING';

  const pendingConsultUserMessageCount =
    activeMode === 'pharmacist' && isConsultRoomPending
      ? activeMessages.filter((chat) => chat.sender === 'USER').length
      : 0;

  const canSendPendingConsultMessage =
    isConsultRoomPending &&
    pendingConsultUserMessageCount < PENDING_CONSULT_MESSAGE_LIMIT;

  const isConsultRoomClosed =
    activeConsultRoom?.status === 'COMPLETED' ||
    activeConsultRoom?.status === 'CLOSED' ||
    locallyClosedConsultRoomIds.includes(activeConsultRoom?.roomId ?? -1);

  const activeConsultSummary =
    activeConsultRoom?.aiConsultationSummary?.trim() ?? '';

  const shouldShowConsultFeedbackForm =
    activeMode === 'pharmacist' &&
    Boolean(activeConsultRoom) &&
    isConsultRoomClosed &&
    activeConsultRoom?.rating == null;

  const shouldShowSubmittedConsultFeedback =
    activeMode === 'pharmacist' &&
    Boolean(activeConsultRoom) &&
    isConsultRoomClosed &&
    activeConsultRoom?.rating != null;

  const canCloseConsultRoom =
    activeMode === 'pharmacist' &&
    activeConsultRoom &&
    isConsultRoomMatched &&
    !isConsultRoomClosed;

  const {
    isConnected: isConsultSocketConnected,
    sendMessage: sendConsultSocketMessage,
  } = useConsultSocket({
    roomId: activeConsultRoom?.roomId,
    senderType: 'USER',
    senderName: '사용자',
    enabled: activeMode === 'pharmacist' && Boolean(activeConsultRoom),
    onMessage: handleReceiveConsultMessage,
  });

  // useEffect(() => {
  //   if (activeMode !== 'pharmacist') {
  //     return;
  //   }

  //   const savedDraft = localStorage.getItem(PHARMACIST_DRAFT_STORAGE_KEY);

  //   if (!savedDraft) {
  //     return;
  //   }

  //   try {
  //     const parsedDraft = JSON.parse(savedDraft) as PharmacistDraftStorageValue;

  //     setMessage(parsedDraft.draft);
  //     setSelectedDrugs(parsedDraft.drugs ?? []);
  //   } catch {
  //     setMessage(savedDraft);
  //   }

  //   setIsDrugSearchOpen(false);
  //   localStorage.removeItem(PHARMACIST_DRAFT_STORAGE_KEY);
  // }, [activeMode]);

  const debouncedDrugSearchKeyword = useDebounce(drugSearchKeyword, 300);

  const isDrugSuggestEnabled =
    isDrugSearchOpen && debouncedDrugSearchKeyword.trim().length >= 2;

  const { data: drugSuggestions = [], isLoading: isDrugSuggestLoading } =
    useMedicineSuggest(
      isDrugSuggestEnabled ? debouncedDrugSearchKeyword.trim() : '',
    );

  const filteredDrugs = useMemo<DrugOption[]>(() => {
    if (!isDrugSearchOpen || !isDrugSuggestEnabled) {
      return [];
    }

    return drugSuggestions.map((name) => ({
      id: getDrugOptionId(name),
      name,
      ingredient: '',
      type: '일반의약품',
    }));
  }, [drugSuggestions, isDrugSearchOpen, isDrugSuggestEnabled]);

  const handleChangeMessage = (value: string) => {
    setMessage(value);

    setSelectedDrugs((prev) => {
      return prev.filter((drug) => value.includes(`@${drug.name}`));
    });

    const isTypingDrugMention = /@([^\s@]*)$/.test(value);

    setIsDrugSearchOpen(isTypingDrugMention);
  };

  const handleSelectDrug = (drug: DrugOption) => {
    setSelectedDrugs((prev) => {
      const alreadySelected = prev.some((item) => item.name === drug.name);

      if (alreadySelected) {
        return prev;
      }

      return [...prev, drug];
    });

    setMessage((prevMessage) => {
      if (/@[^\s@]*$/.test(prevMessage)) {
        return prevMessage.replace(/@[^\s@]*$/, `@${drug.name} `);
      }

      return `${prevMessage.trim()} @${drug.name} `.trimStart();
    });

    setIsDrugSearchOpen(false);
  };

  const sendAiQuestion = async (
    question: string,
    drugs: DrugOption[] = [],
    displayQuestion = question,
  ) => {
    if (isChatbotRoomsLoading) {
      return;
    }

    const userMessage: ChatMessage = {
      id: createMessageId(),
      sender: 'USER',
      content: displayQuestion || '선택한 약에 대해 상담하고 싶어요.',
      createdAt: '방금',
      drugs,
    };

    let roomId: number;

    try {
      roomId = await ensureChatbotRoomId();
    } catch (error) {
      console.error('챗봇 대화방 생성 실패:', error);

      alert('챗봇 대화방을 준비하지 못했습니다. 잠시 후 다시 시도해주세요.');
      return;
    }

    setAiMessagesByRoomId((prev) => ({
      ...prev,
      [roomId]: [...(prev[roomId] ?? []), userMessage],
    }));

    sendChatbotMessageMutation.mutate(
      {
        roomId,
        message: question || drugs.map((drug) => drug.name).join(', '),
      },
      {
        onSuccess: (data) => {
          const answerText =
            data.answer || data.content || '응답 내용을 불러오지 못했습니다.';

          const isFallback = data.answerType === 'FALLBACK';

          const aiMessage: ChatMessage = {
            id: data.messageId ?? createMessageId(),
            apiMessageId: data.messageId ?? null,
            sender: 'AI',
            content: isFallback ? PHARMACIST_GUIDE_MESSAGE : answerText,
            createdAt: data.createdAt ? data.createdAt.slice(11, 16) : '방금',
            sortTime: getMessageSortTime(data.createdAt),
            answerType: data.answerType,
            escalationDraft: isFallback
              ? buildPharmacistDraftText(question, drugs)
              : undefined,
            escalationDrugs: isFallback ? drugs : undefined,
          };

          setAiMessagesByRoomId((prev) => ({
            ...prev,
            [roomId]: [...(prev[roomId] ?? []), aiMessage],
          }));
        },
        onError: (error) => {
          console.error('챗봇 메시지 전송 실패:', error);

          const errorMessage: ChatMessage = {
            id: createMessageId(),
            sender: 'SYSTEM',
            content:
              '현재 챗봇 응답을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.',
            createdAt: '방금',
          };

          setAiMessagesByRoomId((prev) => ({
            ...prev,
            [roomId]: [...(prev[roomId] ?? []), errorMessage],
          }));
        },
      },
    );
  };

  const handleSendMessage = async () => {
    const trimmedMessage = message.trim();

    if (!trimmedMessage && selectedDrugs.length === 0) {
      return;
    }

    if (activeMode === 'ai') {
      const aiQuestion = buildChatbotMessageText(trimmedMessage, selectedDrugs);

      const displayQuestion =
        buildChatbotDisplayText(trimmedMessage, selectedDrugs) ||
        '선택한 약에 대해 확인해주세요.';

      await sendAiQuestion(aiQuestion, selectedDrugs, displayQuestion);
    } else {
      if (!activeConsultRoom) {
        const systemMessage: ChatMessage = {
          id: createMessageId(),
          sender: 'SYSTEM',
          content: '먼저 약사 상담 요청을 생성해주세요.',
          createdAt: '방금',
        };

        setPharmacistMessages((prev) => [...prev, systemMessage]);
        return;
      }

      if (isConsultRoomClosed) {
        const systemMessage: ChatMessage = {
          id: createMessageId(),
          sender: 'SYSTEM',
          content: '이미 종료된 상담입니다. 새 상담 요청을 생성해주세요.',
          createdAt: '방금',
        };

        setPharmacistMessages((prev) => [...prev, systemMessage]);
        return;
      }

      if (!isConsultRoomMatched && !canSendPendingConsultMessage) {
        const systemMessage: ChatMessage = {
          id: createMessageId(),
          sender: 'SYSTEM',
          content:
            '아직 약사가 상담을 수락하지 않았습니다. 잠시만 기다려주세요.',
          createdAt: '방금',
        };

        setPharmacistMessages((prev) => [...prev, systemMessage]);
        return;
      }

      const consultMessage = buildConsultMessageText(
        trimmedMessage,
        selectedDrugs,
      );

      const isSent = sendConsultSocketMessage(consultMessage);

      if (!isSent) {
        const systemMessage: ChatMessage = {
          id: createMessageId(),
          sender: 'SYSTEM',
          content:
            '상담 서버에 연결되지 않았습니다. 잠시 후 다시 시도해주세요.',
          createdAt: '방금',
        };

        setPharmacistMessages((prev) => [...prev, systemMessage]);
        return;
      }

      setConsultSocketMessages((prev) => [
        ...prev,
        {
          id: createMessageId(),
          sender: 'USER',
          content: consultMessage,
          createdAt: '방금',
          sortTime: new Date().getTime(),
          drugs: selectedDrugs,
        },
      ]);
    }

    setMessage('');
    setSelectedDrugs([]);
    setIsDrugSearchOpen(false);
  };

  const handleQuickQuestion = async (question: string) => {
    try {
      const aiQuestion = buildChatbotMessageText(question, selectedDrugs);

      await sendAiQuestion(aiQuestion, selectedDrugs, question);

      setMessage('');
      setSelectedDrugs([]);
      setIsDrugSearchOpen(false);
    } catch (error) {
      console.error('빠른 질문 전송 실패:', error);
    }
  };

  const applyPendingPharmacistDraft = () => {
    const savedDraft = localStorage.getItem(PHARMACIST_DRAFT_STORAGE_KEY);

    if (!savedDraft) {
      return;
    }

    try {
      const parsedDraft = JSON.parse(savedDraft) as PharmacistDraftStorageValue;

      setMessage(parsedDraft.draft);
      setSelectedDrugs(parsedDraft.drugs ?? []);
    } catch {
      setMessage(savedDraft);
      setSelectedDrugs([]);
    }

    setIsDrugSearchOpen(false);
    localStorage.removeItem(PHARMACIST_DRAFT_STORAGE_KEY);
  };

  const handleMoveToPharmacist = () => {
    setActiveMode('pharmacist');
    applyPendingPharmacistDraft();
  };

  const handleContinueToPharmacist = async (
    draft: string,
    drugs: DrugOption[] = [],
  ) => {
    const trimmedDraft = draft.trim();

    if (!trimmedDraft) {
      return;
    }

    const storageValue: PharmacistDraftStorageValue = {
      draft: trimmedDraft,
      drugs,
    };

    localStorage.setItem(
      PHARMACIST_DRAFT_STORAGE_KEY,
      JSON.stringify(storageValue),
    );

    setActiveMode('pharmacist');
    setMessage(trimmedDraft);
    setSelectedDrugs(drugs);
    setIsDrugSearchOpen(false);

    if (activeConsultRoom) {
      setSelectedConsultRoomId(activeConsultRoom.roomId);
      return;
    }

    try {
      const roomId = await createConsultRoomMutation.mutateAsync();
      setSelectedConsultRoomId(roomId);
    } catch (error) {
      console.error('약사 상담방 생성 실패:', error);
    }
  };

  const handleCreateConsultRoom = async () => {
    try {
      const roomId = await createConsultRoomMutation.mutateAsync();

      setSelectedConsultRoomId(roomId);
      setActiveMode('pharmacist');
    } catch (error) {
      console.error('약사 상담방 생성 실패:', error);

      const errorMessage: ChatMessage = {
        id: createMessageId(),
        sender: 'SYSTEM',
        content: '약사 상담 요청에 실패했습니다. 잠시 후 다시 시도해주세요.',
        createdAt: '방금',
      };

      setPharmacistMessages((prev) => [...prev, errorMessage]);
    }
  };

  const handleCloseConsultRoom = async () => {
    if (!activeConsultRoom) {
      return;
    }

    const isConfirmed = window.confirm(
      '상담을 종료하시겠습니까?\n종료 후에는 이 상담방에 메시지를 보낼 수 없습니다.',
    );

    if (!isConfirmed) {
      return;
    }

    try {
      const closedRoomId = activeConsultRoom.roomId;

      await closeConsultRoomMutation.mutateAsync(closedRoomId);

      setSelectedConsultRoomId(closedRoomId);

      setLocallyClosedConsultRoomIds((prev) => {
        if (prev.includes(closedRoomId)) {
          return prev;
        }

        return [...prev, closedRoomId];
      });

      generateConsultSummaryMutation.mutate(closedRoomId, {
        onError: (error) => {
          console.error('상담 요약 생성 실패:', error);
        },
      });

      setConsultSocketMessages((prev) => [
        ...prev,
        {
          id: createMessageId(),
          sender: 'SYSTEM',
          content: '상담이 종료되었습니다. 상담에 대한 평가를 남겨주세요.',
          createdAt: '방금',
          sortTime: new Date().getTime(),
        },
      ]);
    } catch (error) {
      console.error('상담 종료 실패:', error);

      setPharmacistMessages((prev) => [
        ...prev,
        {
          id: createMessageId(),
          sender: 'SYSTEM',
          content: '상담 종료에 실패했습니다. 잠시 후 다시 시도해주세요.',
          createdAt: '방금',
        },
      ]);
    }
  };

  const handleSubmitConsultFeedback = async () => {
    if (!activeConsultRoom?.roomId) {
      return;
    }

    try {
      await submitConsultFeedbackMutation.mutateAsync({
        roomId: activeConsultRoom.roomId,
        body: {
          rating: feedbackRating,
          comment: feedbackComment.trim(),
          pharmacistId: activeConsultRoom.pharmacistId ?? 0,
        },
      });

      setFeedbackComment('');
      setFeedbackRating(5);

      alert('상담 평가가 등록되었습니다.');
    } catch (error) {
      console.error('상담 평가 등록 실패:', error);
      alert('상담 평가 등록에 실패했습니다. 이미 평가를 등록했을 수 있습니다.');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-blue-600">Chat & Consult</p>

        <h1 className="mt-2 text-3xl font-bold text-slate-900">
          챗봇 & 약사 상담
        </h1>

        <p className="mt-2 text-slate-500">
          AI 챗봇으로 복약 정보를 확인하고, 필요하면 약사 상담으로 이어갈 수
          있습니다.
        </p>
      </div>

      <Card className="p-0">
        <div className="flex border-b border-slate-200">
          <button
            type="button"
            onClick={() => setActiveMode('ai')}
            className={[
              'flex-1 px-5 py-4 text-sm font-semibold transition',
              activeMode === 'ai'
                ? 'border-b-2 border-blue-600 text-blue-700'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900',
            ].join(' ')}
          >
            AI 챗봇
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveMode('pharmacist');
              applyPendingPharmacistDraft();
            }}
            className={[
              'flex-1 px-5 py-4 text-sm font-semibold transition',
              activeMode === 'pharmacist'
                ? 'border-b-2 border-blue-600 text-blue-700'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900',
            ].join(' ')}
          >
            약사 상담
          </button>
        </div>

        <div className="grid h-[700px] min-h-0 gap-0 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="h-full min-h-0 space-y-4 overflow-y-auto border-r border-slate-100 bg-slate-50 p-5">
            {activeMode === 'ai' && (
              <>
                <Card>
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-lg font-bold text-slate-900">대화방</h2>

                    <Button
                      type="button"
                      size="sm"
                      onClick={handleCreateChatbotRoom}
                      disabled={createChatbotRoomMutation.isPending}
                    >
                      새 대화
                    </Button>
                  </div>

                  <div className="mt-4 space-y-2">
                    {isChatbotRoomsLoading && (
                      <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500">
                        대화방을 불러오는 중입니다.
                      </div>
                    )}

                    {!isChatbotRoomsLoading && chatbotRooms.length === 0 && (
                      <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-500">
                        아직 생성된 대화방이 없습니다.
                      </div>
                    )}

                    {!isChatbotRoomsLoading &&
                      chatbotRooms.map((room) => {
                        const isSelected = activeChatbotRoomId === room.roomId;
                        const isEditing = editingRoomId === room.roomId;

                        return (
                          <div
                            key={room.roomId}
                            className={[
                              'rounded-xl border p-3',
                              isSelected
                                ? 'border-blue-200 bg-blue-50'
                                : 'border-slate-200 bg-white',
                            ].join(' ')}
                          >
                            {isEditing ? (
                              <div className="space-y-2">
                                <Input
                                  value={editingRoomTitle}
                                  onChange={(event) =>
                                    setEditingRoomTitle(event.target.value)
                                  }
                                  onKeyDown={(event) => {
                                    if (event.key === 'Enter') {
                                      handleSaveRoomTitle(room.roomId);
                                    }
                                  }}
                                />

                                <div className="flex justify-end gap-2">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    className="border border-slate-200"
                                    onClick={handleCancelEditRoomTitle}
                                  >
                                    취소
                                  </Button>

                                  <Button
                                    type="button"
                                    size="sm"
                                    onClick={() =>
                                      handleSaveRoomTitle(room.roomId)
                                    }
                                    disabled={
                                      updateChatbotRoomMutation.isPending
                                    }
                                  >
                                    저장
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <div>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleSelectChatbotRoom(room.roomId)
                                  }
                                  className="w-full text-left"
                                >
                                  <p className="font-semibold text-slate-900">
                                    {room.title || '새 대화'}
                                  </p>

                                  <p className="mt-1 text-xs text-slate-500">
                                    {room.updatedAt
                                      ? room.updatedAt
                                          .slice(0, 16)
                                          .replace('T', ' ')
                                      : '최근 대화 시간 없음'}
                                  </p>
                                </button>

                                <div className="mt-3 flex gap-2">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    className="border border-slate-200"
                                    onClick={() =>
                                      handleStartEditRoomTitle(
                                        room.roomId,
                                        room.title || '새 대화',
                                      )
                                    }
                                  >
                                    이름 수정
                                  </Button>

                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    className="border border-red-200 text-red-600 hover:bg-red-50"
                                    onClick={() =>
                                      handleDeleteChatbotRoom(room.roomId)
                                    }
                                    disabled={
                                      deleteChatbotRoomMutation.isPending
                                    }
                                  >
                                    삭제
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </Card>

                <Card>
                  <h2 className="text-lg font-bold text-slate-900">
                    빠른 질문
                  </h2>

                  <div className="mt-4 space-y-2">
                    {[
                      '복용법 확인',
                      '부작용 확인',
                      '내가 복용 중인 약인지 확인',
                      '같이 먹어도 되는지 확인',
                      '임산부 주의사항 확인',
                    ].map((question) => (
                      <button
                        key={question}
                        type="button"
                        onClick={() => handleQuickQuestion(question)}
                        className="w-full rounded-xl bg-white px-3 py-3 text-left text-sm text-slate-600 hover:bg-blue-50 hover:text-blue-700"
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                </Card>

                <Card className="border-yellow-100 bg-yellow-50">
                  <h2 className="text-lg font-bold text-yellow-700">
                    약사 상담 연결
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-yellow-700">
                    복용 중단, 용량 변경, 심한 부작용 의심 등은 AI 답변만으로
                    판단하지 않고 약사 상담을 권장합니다.
                  </p>

                  <Button
                    type="button"
                    className="mt-4 w-full"
                    onClick={
                      activeConsultRoom
                        ? handleMoveToPharmacist
                        : handleCreateConsultRoom
                    }
                    disabled={
                      createConsultRoomMutation.isPending ||
                      isMyConsultRoomsLoading
                    }
                  >
                    {createConsultRoomMutation.isPending
                      ? '상담 요청 중...'
                      : activeConsultRoom?.status === 'PENDING'
                        ? '상담 대기방으로 이동'
                        : activeConsultRoom
                          ? '진행 중인 상담으로 이동'
                          : '약사 상담 요청'}
                  </Button>
                </Card>
              </>
            )}

            {activeMode === 'pharmacist' && (
              <>
                <Card>
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-lg font-bold text-slate-900">
                      내 상담 내역
                    </h2>

                    <Button
                      type="button"
                      size="sm"
                      onClick={handleCreateConsultRoom}
                      disabled={createConsultRoomMutation.isPending}
                    >
                      새 상담
                    </Button>
                  </div>

                  <div className="mt-4 space-y-4">
                    <div>
                      <p className="mb-2 text-xs font-bold text-slate-500">
                        진행 중
                      </p>

                      {activeConsultRooms.length === 0 ? (
                        <div className="rounded-xl bg-white p-3 text-sm text-slate-500">
                          진행 중인 상담이 없습니다.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {activeConsultRooms.map((room) => {
                            const isSelected =
                              activeConsultRoom?.roomId === room.roomId;

                            return (
                              <button
                                key={room.roomId}
                                type="button"
                                onClick={() => {
                                  setSelectedConsultRoomId(room.roomId);
                                  setActiveMode('pharmacist');
                                }}
                                className={[
                                  'w-full rounded-xl border p-3 text-left text-sm transition',
                                  isSelected
                                    ? 'border-blue-200 bg-blue-50'
                                    : 'border-slate-200 bg-white hover:bg-slate-50',
                                ].join(' ')}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <p className="font-semibold text-slate-900">
                                    상담방 #{room.roomId}
                                  </p>

                                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500">
                                    {room.status === 'PENDING'
                                      ? '대기'
                                      : '진행'}
                                  </span>
                                </div>

                                <p className="mt-1 line-clamp-2 text-slate-500">
                                  {room.firstMessage || '상담 메시지 없음'}
                                </p>

                                <p className="mt-1 text-xs text-slate-400">
                                  {room.createdAt
                                    ?.slice(0, 16)
                                    .replace('T', ' ')}
                                </p>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div>
                      <p className="mb-2 text-xs font-bold text-slate-500">
                        종료 내역
                      </p>

                      {completedConsultRooms.length === 0 ? (
                        <div className="rounded-xl bg-white p-3 text-sm text-slate-500">
                          종료된 상담이 없습니다.
                        </div>
                      ) : (
                        <div className="max-h-56 space-y-2 overflow-y-auto">
                          {completedConsultRooms.map((room) => {
                            const isSelected =
                              activeConsultRoom?.roomId === room.roomId;

                            return (
                              <button
                                key={room.roomId}
                                type="button"
                                onClick={() => {
                                  setSelectedConsultRoomId(room.roomId);
                                  setActiveMode('pharmacist');
                                }}
                                className={[
                                  'w-full rounded-xl border p-3 text-left text-sm transition',
                                  isSelected
                                    ? 'border-blue-200 bg-blue-50'
                                    : 'border-slate-200 bg-white hover:bg-slate-50',
                                ].join(' ')}
                              >
                                <p className="font-semibold text-slate-900">
                                  상담방 #{room.roomId}
                                </p>

                                <p className="mt-1 line-clamp-2 text-slate-500">
                                  {room.firstMessage || '상담 메시지 없음'}
                                </p>

                                <p className="mt-1 text-xs text-slate-400">
                                  {room.createdAt
                                    ?.slice(0, 16)
                                    .replace('T', ' ')}
                                </p>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              </>
            )}
          </aside>

          <div className="flex h-full min-h-0 flex-col">
            {activeMode === 'pharmacist' && (
              <div className="border-b border-slate-100 p-4">
                <div className="rounded-2xl bg-yellow-50 p-4 text-sm leading-6 text-yellow-700">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-bold">
                      {getConsultRoomStatusLabel(activeConsultRoom?.status)}
                    </p>

                    <div className="flex flex-wrap items-center gap-2">
                      {activeConsultRoom && (
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-yellow-700">
                          상담방 #{activeConsultRoom.roomId}
                        </span>
                      )}

                      {canCloseConsultRoom && (
                        <button
                          type="button"
                          onClick={handleCloseConsultRoom}
                          disabled={closeConsultRoomMutation.isPending}
                          className="rounded-full bg-yellow-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-yellow-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {closeConsultRoomMutation.isPending
                            ? '종료 중'
                            : '상담 종료'}
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="mt-1">
                    {getConsultRoomStatusDescription(activeConsultRoom?.status)}
                  </p>

                  {activeConsultRoom?.status === 'PENDING' && (
                    <p className="mt-2 text-xs text-yellow-600">
                      약사가 수락하면 상태가 자동으로 갱신됩니다.
                    </p>
                  )}
                </div>
              </div>
            )}

            <div
              ref={chatMessagesContainerRef}
              className="min-h-0 flex-1 overflow-y-auto p-6"
            >
              <div className="space-y-4">
                {activeMode === 'ai' && isChatbotRoomMessagesLoading && (
                  <div className="rounded-2xl bg-blue-50 p-4 text-sm text-blue-700">
                    대화 내용을 불러오는 중입니다.
                  </div>
                )}

                {activeMode === 'ai' &&
                  !activeChatbotRoomId &&
                  chatbotRooms.length > 0 && (
                    <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                      왼쪽 대화방 목록에서 대화방을 선택하거나 새 대화를
                      시작해주세요.
                    </div>
                  )}

                {activeMessages.map((chat, index) => {
                  const displayParts = getChatDisplayParts(chat);

                  const previousUserMessage = getPreviousUserMessage(activeMessages, index);

                  const shouldShowPharmacistButton =
                    activeMode === 'ai' &&
                    chat.sender === 'AI' &&
                    chat.answerType === 'FALLBACK';

                  const pharmacistDraft =
                    chat.escalationDraft ??
                    (previousUserMessage
                      ? buildPharmacistDraftText(
                          previousUserMessage.content,
                          previousUserMessage.drugs ?? [],
                        )
                      : '');

                  return (
                    <div
                      key={chat.id}
                      className={[
                        'flex',
                        chat.sender === 'USER'
                          ? 'justify-end'
                          : 'justify-start',
                      ].join(' ')}
                    >
                      <div
                        className={[
                          'max-w-[80%] rounded-2xl p-4',
                          chat.sender === 'USER'
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-700',
                        ].join(' ')}
                      >
                        <div className="mb-2 flex items-center gap-2">
                          <Badge variant={getSenderBadge(chat.sender)}>
                            {getSenderLabel(chat.sender)}
                          </Badge>

                          <span
                            className={[
                              'text-xs',
                              chat.sender === 'USER'
                                ? 'text-blue-100'
                                : 'text-slate-400',
                            ].join(' ')}
                          >
                            {chat.createdAt}
                          </span>
                        </div>

                        {displayParts.drugNames.length > 0 && (
                          <div className="mb-3 space-y-1">
                            {displayParts.drugNames.map((drugName) => (
                              <p
                                key={drugName}
                                className="text-sm font-bold leading-6"
                              >
                                {drugName}
                              </p>
                            ))}
                          </div>
                        )}

                        {displayParts.content && (
                          <p className="whitespace-pre-line text-sm leading-6">
                            {displayParts.content}
                          </p>
                        )}
                        {shouldShowPharmacistButton && pharmacistDraft && (
                          <div className="mt-3">
                            <button
                              type="button"
                              onClick={() =>
                                handleContinueToPharmacist(
                                  pharmacistDraft,
                                  chat.escalationDrugs ?? previousUserMessage?.drugs ?? [],
                                )
                              }
                              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                            >
                              약사 상담 이어가기
                            </button>
                          </div>
                        )}
                        {activeMode === 'ai' && chat.apiMessageId && (
                          <div className="mt-3 flex justify-end">
                            <button
                              type="button"
                              onClick={() => handleDeleteChatbotMessage(chat)}
                              disabled={deleteChatbotMessageMutation.isPending}
                              className={[
                                'text-xs font-semibold',
                                chat.sender === 'USER'
                                  ? 'text-blue-100 hover:text-white'
                                  : 'text-slate-400 hover:text-red-600',
                              ].join(' ')}
                            >
                              삭제
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {activeMode === 'ai' &&
                  sendChatbotMessageMutation.isPending && (
                    <div className="flex justify-start">
                      <div className="rounded-2xl bg-slate-100 p-4 text-sm text-slate-500">
                        AI가 답변을 생성하고 있습니다...
                      </div>
                    </div>
                  )}
              </div>
            </div>

            {activeMode === 'pharmacist' && activeConsultRoom && isConsultRoomClosed && (
              <div className="shrink-0 border-t border-slate-100 p-4">
                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                  <p className="text-sm font-bold text-blue-800">
                    AI 상담 요약
                  </p>

                  {activeConsultSummary ? (
                    <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-700">
                      {activeConsultSummary}
                    </p>
                  ) : (
                    <p className="mt-3 text-sm leading-6 text-blue-700">
                      상담 요약이 아직 준비되지 않았습니다.
                    </p>
                  )}
                </div>
              </div>
            )}

            {shouldShowConsultFeedbackForm && activeConsultRoom && (
              <div className="shrink-0 border-t border-slate-100 p-4">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm font-bold text-slate-900">
                    상담은 어떠셨나요?
                  </p>

                  <div className="mt-3 flex gap-2">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        type="button"
                        onClick={() => setFeedbackRating(rating)}
                        className={[
                          'rounded-full px-3 py-2 text-sm font-bold transition',
                          feedbackRating >= rating
                            ? 'bg-yellow-400 text-white'
                            : 'bg-white text-slate-400',
                        ].join(' ')}
                      >
                        ★
                      </button>
                    ))}
                  </div>

                  <textarea
                    value={feedbackComment}
                    onChange={(event) => setFeedbackComment(event.target.value)}
                    placeholder="상담에 대한 한줄평을 남겨주세요."
                    className="mt-3 min-h-24 w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                  />

                  <div className="mt-3 flex justify-end">
                    <Button
                      type="button"
                      onClick={handleSubmitConsultFeedback}
                      disabled={submitConsultFeedbackMutation.isPending}
                    >
                      {submitConsultFeedbackMutation.isPending
                        ? '등록 중...'
                        : '평가 등록'}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {shouldShowSubmittedConsultFeedback && activeConsultRoom && (
              <div className="shrink-0 border-t border-slate-100 p-4">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm font-bold text-slate-900">
                    내가 남긴 상담 평가
                  </p>

                  <p className="mt-2 text-sm text-yellow-500">
                    {'★'.repeat(activeConsultRoom.rating ?? 0)}
                    <span className="text-slate-300">
                      {'★'.repeat(5 - (activeConsultRoom.rating ?? 0))}
                    </span>
                  </p>

                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {activeConsultRoom.feedbackComment || '한줄평이 없습니다.'}
                  </p>
                </div>
              </div>
            )}

            <div className="shrink-0 border-t border-slate-100 p-4">
              <div className="relative">
                <div className="flex w-full gap-2">
                  <div className="flex-1">
                    <Input
                      placeholder="@로 약을 검색하거나 질문을 입력하세요."
                      value={message}
                      onChange={(event) =>
                        handleChangeMessage(event.target.value)
                      }
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          handleSendMessage();
                        }
                      }}
                    />
                  </div>

                  <Button
                    type="button"
                    className="w-24 shrink-0"
                    onClick={handleSendMessage}
                    disabled={
                      sendChatbotMessageMutation.isPending ||
                      createChatbotRoomMutation.isPending ||
                      (activeMode === 'pharmacist' &&
                        (!activeConsultRoom ||
                          (!isConsultRoomMatched &&
                            !canSendPendingConsultMessage) ||
                          isConsultRoomClosed ||
                          !isConsultSocketConnected))
                    }
                  >
                    {activeMode === 'pharmacist'
                      ? isConsultRoomClosed
                        ? '종료된 상담'
                        : isConsultSocketConnected
                          ? '전송'
                          : '연결 중'
                      : sendChatbotMessageMutation.isPending
                        ? '전송 중...'
                        : '전송'}
                  </Button>
                </div>

                {isDrugSearchOpen && (
                  <div className="absolute bottom-full left-0 z-10 mb-2 w-full rounded-2xl border border-slate-200 bg-white p-2 shadow-lg">
                    <div className="mb-2 px-2 text-xs font-semibold text-slate-500">
                      약 검색 결과
                    </div>

                    <div className="max-h-56 overflow-y-auto">
                      {drugSearchKeyword.trim().length < 2 && (
                        <div className="px-3 py-4 text-sm text-slate-500">
                          두 글자 이상 입력하면 약 이름을 검색합니다.
                        </div>
                      )}

                      {drugSearchKeyword.trim().length >= 2 &&
                        isDrugSuggestLoading && (
                          <div className="px-3 py-4 text-sm text-slate-500">
                            약 이름을 검색하고 있습니다.
                          </div>
                        )}

                      {drugSearchKeyword.trim().length >= 2 &&
                        !isDrugSuggestLoading &&
                        filteredDrugs.length === 0 && (
                          <div className="px-3 py-4 text-sm text-slate-500">
                            검색 결과가 없습니다.
                          </div>
                        )}

                      {filteredDrugs.map((drug) => (
                        <button
                          key={drug.name}
                          type="button"
                          onClick={() => handleSelectDrug(drug)}
                          className="w-full rounded-xl px-3 py-3 text-left hover:bg-slate-50"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-slate-900">
                              {drug.name}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default ChatPage;
