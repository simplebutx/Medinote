import { useMemo, useState } from 'react';
import { Badge, Button, Card } from '../../components/ui';

type ChatMode = 'ai' | 'pharmacist';
type Sender = 'USER' | 'AI' | 'PHARMACIST' | 'SYSTEM';

interface DrugOption {
  id: number;
  name: string;
  ingredient: string;
}

interface ChatMessage {
  id: number;
  sender: Sender;
  content: string;
  time: string;
  drugs?: DrugOption[];
}

const drugOptions: DrugOption[] = [
  { id: 1, name: '아스피린 100mg', ingredient: '아스피린' },
  { id: 2, name: '타이레놀 500mg', ingredient: '아세트아미노펜' },
  { id: 3, name: '암로디핀 5mg', ingredient: '암로디핀베실산염' },
  { id: 4, name: '페니실린', ingredient: '페니실린계' },
];

const initialAiMessages: ChatMessage[] = [
  {
    id: 1,
    sender: 'AI',
    content:
      '안녕하세요. 복약 관련 궁금한 점을 입력해주세요. 약 이름을 함께 선택하면 더 구체적으로 안내할 수 있어요.',
    time: '09:30',
  },
];

const initialPharmacistMessages: ChatMessage[] = [
  {
    id: 1,
    sender: 'SYSTEM',
    content: '약사 상담방이 생성되었습니다.',
    time: '09:34',
  },
  {
    id: 2,
    sender: 'PHARMACIST',
    content:
      '안녕하세요. 선택하신 약과 복용 이력을 확인한 뒤 답변드리겠습니다.',
    time: '09:35',
  },
];

function getSenderLabel(sender: Sender) {
  if (sender === 'USER') return '나';
  if (sender === 'AI') return 'AI';
  if (sender === 'PHARMACIST') return '약사';
  return '시스템';
}

function getSenderBadgeVariant(sender: Sender) {
  if (sender === 'USER') return 'blue';
  if (sender === 'AI') return 'green';
  if (sender === 'PHARMACIST') return 'yellow';
  return 'gray';
}

function ChatPage() {
  const [activeMode, setActiveMode] = useState<ChatMode>('ai');
  const [message, setMessage] = useState('');
  const [drugKeyword, setDrugKeyword] = useState('');
  const [isDrugSearchOpen, setIsDrugSearchOpen] = useState(false);
  const [selectedDrugs, setSelectedDrugs] = useState<DrugOption[]>([]);
  const [aiMessages, setAiMessages] =
    useState<ChatMessage[]>(initialAiMessages);
  const [pharmacistMessages, setPharmacistMessages] = useState<ChatMessage[]>(
    initialPharmacistMessages,
  );

  const filteredDrugs = useMemo(() => {
    const keyword = drugKeyword.trim().toLowerCase();

    if (!keyword) {
      return drugOptions;
    }

    return drugOptions.filter((drug) => {
      return (
        drug.name.toLowerCase().includes(keyword) ||
        drug.ingredient.toLowerCase().includes(keyword)
      );
    });
  }, [drugKeyword]);

  const currentMessages = activeMode === 'ai' ? aiMessages : pharmacistMessages;

  const handleChangeMessage = (value: string) => {
    setMessage(value);

    const words = value.split(/\s/);
    const lastWord = words[words.length - 1];

    if (lastWord.startsWith('@')) {
      const keyword = lastWord.replace('@', '');
      setDrugKeyword(keyword);
      setIsDrugSearchOpen(true);
      return;
    }

    setIsDrugSearchOpen(false);
    setDrugKeyword('');
  };

  const handleSelectDrug = (drug: DrugOption) => {
    setSelectedDrugs((prev) => {
      const alreadySelected = prev.some((item) => item.id === drug.id);

      if (alreadySelected) {
        return prev;
      }

      return [...prev, drug];
    });

    setMessage((prev) => {
      const words = prev.split(/\s/);
      const lastWord = words[words.length - 1];

      if (lastWord.startsWith('@')) {
        return words.slice(0, -1).join(' ').trimEnd();
      }

      return prev;
    });

    setDrugKeyword('');
    setIsDrugSearchOpen(false);
  };

  const handleRemoveDrug = (drugId: number) => {
    setSelectedDrugs((prev) => prev.filter((drug) => drug.id !== drugId));
  };

  const handleSendMessage = () => {
    if (!message.trim()) {
      alert('메시지를 입력해주세요.');
      return;
    }

    const newUserMessage: ChatMessage = {
      id: Date.now(),
      sender: 'USER',
      content: message.trim(),
      time: '방금',
      drugs: selectedDrugs,
    };

    if (activeMode === 'ai') {
      const aiResponse: ChatMessage = {
        id: Date.now() + 1,
        sender: 'AI',
        content:
          selectedDrugs.length > 0
            ? '선택하신 약 정보를 함께 확인했습니다. 현재는 개발용 응답이며, 추후 AI 답변 API와 연결됩니다.'
            : '질문을 확인했습니다. 약 이름을 함께 선택하면 더 정확한 안내가 가능합니다.',
        time: '방금',
      };

      setAiMessages((prev) => [...prev, newUserMessage, aiResponse]);
    }

    if (activeMode === 'pharmacist') {
      setPharmacistMessages((prev) => [...prev, newUserMessage]);
    }

    setMessage('');
    setSelectedDrugs([]);
    setIsDrugSearchOpen(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-blue-600">
          Chat & Consultation
        </p>

        <h1 className="mt-2 text-3xl font-bold text-slate-900">
          AI 챗봇 / 약사 상담
        </h1>

        <p className="mt-2 text-slate-500">
          AI 챗봇으로 복약 질문을 확인하고, 필요하면 약사 상담으로 이어갈 수
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

        <div className="grid min-h-[620px] lg:grid-cols-[1fr_320px]">
          <div className="flex min-h-[620px] flex-col border-r border-slate-200">
            {activeMode === 'pharmacist' && (
              <div className="border-b border-blue-100 bg-blue-50 p-4">
                <p className="font-bold text-blue-700">AI 요약</p>
                <p className="mt-2 text-sm leading-6 text-blue-700">
                  사용자가 선택한 약과 복용 이력을 바탕으로 약사 상담을
                  요청했습니다. 선택 약 정보와 알레르기/주의 성분 정보가 함께
                  전달됩니다.
                </p>
              </div>
            )}

            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              {currentMessages.map((chat) => {
                const isMine = chat.sender === 'USER';

                return (
                  <div
                    key={chat.id}
                    className={[
                      'flex',
                      isMine ? 'justify-end' : 'justify-start',
                    ].join(' ')}
                  >
                    <div
                      className={[
                        'max-w-[78%] rounded-2xl p-4',
                        isMine
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-800',
                      ].join(' ')}
                    >
                      <div className="mb-2 flex items-center gap-2">
                        <Badge variant={getSenderBadgeVariant(chat.sender)}>
                          {getSenderLabel(chat.sender)}
                        </Badge>
                        <span
                          className={[
                            'text-xs',
                            isMine ? 'text-blue-100' : 'text-slate-500',
                          ].join(' ')}
                        >
                          {chat.time}
                        </span>
                      </div>

                      <p className="text-sm leading-6">{chat.content}</p>
                      {chat.drugs && chat.drugs.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {chat.drugs.map((drug) => (
                            <div
                              key={drug.id}
                              className={[
                                'rounded-xl border p-3 text-sm',
                                isMine
                                  ? 'border-blue-300 bg-blue-500 text-white'
                                  : 'border-slate-200 bg-white text-slate-700',
                              ].join(' ')}
                            >
                              <p className="font-bold">@{drug.name}</p>
                              <p
                                className={[
                                  'mt-1 text-xs',
                                  isMine ? 'text-blue-100' : 'text-slate-500',
                                ].join(' ')}
                              >
                                성분: {drug.ingredient}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-slate-200 p-4">
              {selectedDrugs.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {selectedDrugs.map((drug) => (
                    <button
                      key={drug.id}
                      type="button"
                      onClick={() => handleRemoveDrug(drug.id)}
                      className="rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700"
                    >
                      @{drug.name} ×
                    </button>
                  ))}
                </div>
              )}

              <div className="relative">
                <textarea
                  value={message}
                  onChange={(event) => handleChangeMessage(event.target.value)}
                  placeholder="메시지를 입력하세요. @를 입력하면 약을 검색할 수 있습니다."
                  rows={3}
                  className="w-full resize-none rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />

                {isDrugSearchOpen && (
                  <div className="absolute bottom-full left-0 z-10 mb-2 w-full rounded-2xl border border-slate-200 bg-white p-2 shadow-lg">
                    <div className="mb-2 px-2 text-xs font-semibold text-slate-500">
                      약 검색 결과
                    </div>

                    <div className="max-h-56 overflow-y-auto">
                      {filteredDrugs.map((drug) => (
                        <button
                          key={drug.id}
                          type="button"
                          onClick={() => handleSelectDrug(drug)}
                          className="w-full rounded-xl px-3 py-3 text-left hover:bg-slate-50"
                        >
                          <p className="font-semibold text-slate-900">
                            {drug.name}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {drug.ingredient}
                          </p>
                        </button>
                      ))}

                      {filteredDrugs.length === 0 && (
                        <div className="px-3 py-4 text-sm text-slate-500">
                          검색 결과가 없습니다.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-3 flex justify-end">
                <Button type="button" onClick={handleSendMessage}>
                  전송
                </Button>
              </div>
            </div>
          </div>

          <aside className="space-y-4 p-5">
            <Card className="bg-slate-50">
              <h2 className="text-lg font-bold text-slate-900">
                선택된 약 정보
              </h2>

              {selectedDrugs.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">
                  아직 선택된 약이 없습니다. 입력창에서 @를 입력하면 약을
                  검색하고 선택할 수 있습니다.
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  {selectedDrugs.map((drug) => (
                    <div
                      key={drug.id}
                      className="rounded-2xl bg-white p-4 shadow-sm"
                    >
                      <p className="font-semibold text-slate-900">
                        {drug.name}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {drug.ingredient}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card>
              <h2 className="text-lg font-bold text-slate-900">
                상담 참고 정보
              </h2>

              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <div className="rounded-xl bg-red-50 p-3 text-red-700">
                  주의 성분: 아스피린 부작용 이력
                </div>

                <div className="rounded-xl bg-slate-50 p-3">
                  최근 복용: 아스피린 100mg, 암로디핀 5mg
                </div>

                <div className="rounded-xl bg-slate-50 p-3">
                  상담 전환 시 선택 약 정보가 함께 전달됩니다.
                </div>
              </div>
            </Card>

            {activeMode === 'ai' && (
              <Card className="bg-blue-50">
                <h2 className="text-lg font-bold text-blue-700">
                  약사 상담 연결
                </h2>

                <p className="mt-3 text-sm leading-6 text-blue-700">
                  AI 답변만으로 판단하기 어려운 질문은 약사 상담으로 전환할 수
                  있습니다.
                </p>

                <Button
                  type="button"
                  className="mt-4 w-full"
                  onClick={() => setActiveMode('pharmacist')}
                >
                  약사 상담으로 이동
                </Button>
              </Card>
            )}
          </aside>
        </div>
      </Card>
    </div>
  );
}

export default ChatPage;
