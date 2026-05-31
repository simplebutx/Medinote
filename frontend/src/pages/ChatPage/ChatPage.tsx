import { useMemo, useRef, useState } from 'react';

import { Badge, Button, Card, Input } from '../../components/ui';
import { useSendChatbotMessage } from "../../features/chat/hooks";
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
  sender: MessageSender;
  content: string;
  createdAt: string;
  drugs?: DrugOption[];
}

const initialAiMessages: ChatMessage[] = [
  {
    id: 1,
    sender: 'AI',
    content:
      '안녕하세요. 복약 관련 궁금한 점을 물어보세요. 약 이름을 @로 검색해서 함께 보낼 수 있어요.',
    createdAt: '09:00',
  },
];

const initialPharmacistMessages: ChatMessage[] = [
  {
    id: 1,
    sender: 'PHARMACIST',
    content:
      '안녕하세요. 약사 상담입니다. 복용 중인 약과 증상을 함께 알려주시면 확인해드릴게요.',
    createdAt: '09:05',
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

function ChatPage() {
  const messageIdRef = useRef(100);

  const createMessageId = () => {
    messageIdRef.current += 1;
    return messageIdRef.current;
  };

  const sendChatbotMessageMutation = useSendChatbotMessage();

  const [activeMode, setActiveMode] = useState<ChatMode>('ai');
  const [aiMessages, setAiMessages] =
    useState<ChatMessage[]>(initialAiMessages);
  const [pharmacistMessages, setPharmacistMessages] = useState<ChatMessage[]>(
    initialPharmacistMessages,
  );

  const [message, setMessage] = useState('');
  const [selectedDrugs, setSelectedDrugs] = useState<DrugOption[]>([]);
  const [isDrugSearchOpen, setIsDrugSearchOpen] = useState(false);

  const activeMessages = activeMode === 'ai' ? aiMessages : pharmacistMessages;

  const drugSearchKeyword = useMemo(() => {
    const atIndex = message.lastIndexOf('@');

    if (atIndex === -1) {
      return '';
    }

    return message.slice(atIndex + 1).trim();
  }, [message]);

  const debouncedDrugSearchKeyword = useDebounce(drugSearchKeyword, 300);

  const isDrugSuggestEnabled =
    isDrugSearchOpen && debouncedDrugSearchKeyword.trim().length >= 2;

  const {
    data: drugSuggestions = [],
    isLoading: isDrugSuggestLoading,
  } = useMedicineSuggest(
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

    if (value.includes('@')) {
      setIsDrugSearchOpen(true);
      return;
    }

    setIsDrugSearchOpen(false);
  };

  const handleSelectDrug = (drug: DrugOption) => {
    setSelectedDrugs((prev) => {
      const alreadySelected = prev.some((item) => item.name === drug.name);

      if (alreadySelected) {
        return prev;
      }

      return [...prev, drug];
    });

    const atIndex = message.lastIndexOf('@');

    if (atIndex >= 0) {
      setMessage(message.slice(0, atIndex).trim());
    }

    setIsDrugSearchOpen(false);
  };

  const handleRemoveSelectedDrug = (drugId: number) => {
    setSelectedDrugs((prev) => prev.filter((drug) => drug.id !== drugId));
  };

  const handleSendMessage = () => {
    const trimmedMessage = message.trim();

    if (!trimmedMessage && selectedDrugs.length === 0) {
      return;
    }

    const userMessage: ChatMessage = {
      id: createMessageId(),
      sender: 'USER',
      content: trimmedMessage || '선택한 약에 대해 상담하고 싶어요.',
      createdAt: '방금',
      drugs: selectedDrugs,
    };

    if (activeMode === "ai") {
      setAiMessages((prev) => [...prev, userMessage]);

      sendChatbotMessageMutation.mutate(
        {
          message: trimmedMessage || selectedDrugs.map((drug) => drug.name).join(", "),
        },
        {
          onSuccess: (data) => {
            const aiMessage: ChatMessage = {
              id: createMessageId(),
              sender: "AI",
              content: data.answer,
              createdAt: "방금",
            };

            setAiMessages((prev) => [...prev, aiMessage]);
          },
          onError: (error) => {
            console.error("챗봇 메시지 전송 실패:", error);

            const errorMessage: ChatMessage = {
              id: createMessageId(),
              sender: "SYSTEM",
              content:
                "현재 챗봇 응답을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.",
              createdAt: "방금",
            };

            setAiMessages((prev) => [...prev, errorMessage]);
          },
        }
      );
    } else {
      setPharmacistMessages((prev) => [...prev, userMessage]);

      window.setTimeout(() => {
        const pharmacistMessage: ChatMessage = {
          id: createMessageId(),
          sender: 'PHARMACIST',
          content:
            '상담 내용을 확인했습니다. 현재 복용 중인 약, 증상 발생 시점, 알레르기 이력을 함께 확인하면 더 정확히 안내할 수 있습니다.',
          createdAt: '방금',
        };

        setPharmacistMessages((prev) => [...prev, pharmacistMessage]);
      }, 500);
    }

    setMessage('');
    setSelectedDrugs([]);
    setIsDrugSearchOpen(false);
  };

  const handleQuickQuestion = (question: string) => {
    const quickMessage: ChatMessage = {
      id: createMessageId(),
      sender: 'USER',
      content: question,
      createdAt: '방금',
    };

    if (activeMode === 'ai') {
      setAiMessages((prev) => [...prev, quickMessage]);

      window.setTimeout(() => {
        const aiMessage: ChatMessage = {
          id: createMessageId(),
          sender: 'AI',
          content:
            '질문을 확인했어요. 현재는 Mock 응답이며, 추후 약 정보 DB와 AI 서버를 연결해 복용법과 주의사항을 안내합니다.',
          createdAt: '방금',
        };

        setAiMessages((prev) => [...prev, aiMessage]);
      }, 500);

      return;
    }

    setPharmacistMessages((prev) => [...prev, quickMessage]);
  };

  const handleMoveToPharmacist = () => {
    setActiveMode('pharmacist');
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
            onClick={() => setActiveMode('pharmacist')}
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

        <div className="grid min-h-[620px] gap-0 lg:grid-cols-[1fr_320px]">
          <div className="flex flex-col border-r border-slate-100">
            <div className="space-y-4 p-6">
              {activeMode === 'pharmacist' && (
                <div className="rounded-2xl bg-yellow-50 p-4 text-sm leading-6 text-yellow-700">
                  <p className="font-bold">AI 요약</p>
                  <p className="mt-1">
                    사용자가 선택한 약과 질문 내용을 바탕으로 약사에게 상담
                    요약이 전달됩니다. 실제 연동 시 복용 이력, 주의 성분,
                    알레르기 정보도 함께 표시됩니다.
                  </p>
                </div>
              )}

              {activeMessages.map((chat) => (
                <div
                  key={chat.id}
                  className={[
                    'flex',
                    chat.sender === 'USER' ? 'justify-end' : 'justify-start',
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

                    {chat.drugs && chat.drugs.length > 0 && (
                      <div className="mb-3 space-y-2">
                        {chat.drugs.map((drug) => (
                          <div
                            key={drug.id}
                            className={[
                              'rounded-xl p-3 text-sm',
                              chat.sender === 'USER'
                                ? 'bg-white/15 text-white'
                                : 'bg-white text-slate-700',
                            ].join(' ')}
                          >
                            <p className="font-bold">{drug.name}</p>
                            <p className="mt-1 text-xs opacity-80">
                              성분: {drug.ingredient}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}

                    <p className="text-sm leading-6">{chat.content}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-auto border-t border-slate-100 p-4">
              {selectedDrugs.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {selectedDrugs.map((drug) => (
                    <button
                      key={drug.id}
                      type="button"
                      onClick={() => handleRemoveSelectedDrug(drug.id)}
                      className="rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700"
                    >
                      {drug.name} ×
                    </button>
                  ))}
                </div>
              )}

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
                    className="shrink-0"
                    onClick={handleSendMessage}
                  >
                    전송
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

                      {drugSearchKeyword.trim().length >= 2 && isDrugSuggestLoading && (
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
                            <p className="font-semibold text-slate-900">{drug.name}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <aside className="space-y-4 bg-slate-50 p-5">
            <Card>
              <h2 className="text-lg font-bold text-slate-900">빠른 질문</h2>

              <div className="mt-4 space-y-2">
                {[
                  '이 약은 식후에 먹어야 해?',
                  '다른 약과 같이 먹어도 돼?',
                  '오늘 저녁 약 먹었는지 확인해줘',
                  '속이 불편한데 계속 먹어도 돼?',
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
                onClick={handleMoveToPharmacist}
              >
                약사 상담으로 이동
              </Button>
            </Card>

            <Card>
              <h2 className="text-lg font-bold text-slate-900">
                상담 참고 정보
              </h2>

              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <div className="rounded-xl bg-white p-3">
                  선택한 약:{' '}
                  {selectedDrugs.length > 0
                    ? selectedDrugs.map((drug) => drug.name).join(', ')
                    : '아직 선택된 약이 없습니다.'}
                </div>

                <div className="rounded-xl bg-white p-3">
                  주의 성분: 내 정보의 주의 약/성분과 연동 예정
                </div>

                <div className="rounded-xl bg-white p-3">
                  건강 정보: 내 정보의 건강 정보와 연동 예정
                </div>
              </div>
            </Card>
          </aside>
        </div>
      </Card>
    </div>
  );
}

export default ChatPage;
