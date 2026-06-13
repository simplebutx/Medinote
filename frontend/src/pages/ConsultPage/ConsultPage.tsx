import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';

import { Badge, Card } from '../../components/ui';
import {
  useActiveConsultRooms,
  useCloseConsultRoom,
  useCompletedConsultRooms,
  useConsultMessages,
  useConsultPatientInfo,
  useConsultSocket,
  useGenerateConsultSummary,
  useMatchConsultRoom,
  usePendingConsultRooms,
} from '../../features/consult/hooks';
import type {
  ConsultMessage,
  ConsultRoom,
  ConsultRoomStatus,
  ConsultSocketMessage,
} from '../../features/consult/types';

type ConsultTabStatus = 'PENDING' | 'ACTIVE' | 'COMPLETED';

function getConsultStatusLabel(status: ConsultRoomStatus) {
  if (status === 'PENDING') return '대기';
  if (status === 'MATCHED' || status === 'ACTIVE') return '진행 중';
  return '완료';
}

function getConsultStatusBadge(status: ConsultRoomStatus) {
  if (status === 'PENDING') return 'yellow';
  if (status === 'MATCHED' || status === 'ACTIVE') return 'blue';
  return 'green';
}

function getPatientName(room?: ConsultRoom | null) {
  if (!room) return '-';

  return room.customerName || `환자 #${room.customerId ?? room.customId ?? room.roomId}`;
}

function getConsultTitle(room?: ConsultRoom | null) {
  if (!room) return '-';

  return room.firstMessage || '복약 상담 요청';
}

function formatDateTime(value?: string) {
  if (!value) return '-';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function getConsultMessageSortTime(message: {
  createdAt?: string;
}) {
  if (!message.createdAt) {
    return Date.now();
  }

  const time = new Date(message.createdAt).getTime();

  if (Number.isNaN(time)) {
    return Date.now();
  }

  return time;
}

function getConsultMessageContent(message: {
  message?: string;
  content?: string;
}) {
  return (
    message.content ??
    message.message ??
    '메시지 내용을 불러오지 못했습니다.'
  );
}

function getRatingStars(rating?: number | null) {
  if (rating == null) {
    return '아직 평가 없음';
  }

  return `${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}`;
}

function getPatientDisplayName(patientInfo: {
  username?: string;
  customerName?: string;
} | null | undefined) {
  return patientInfo?.username || patientInfo?.customerName || '-';
}

function getPatientHealthBadges(patientInfo: {
  isPregnant?: boolean;
  isBreastfeeding?: boolean;
  isSmoking?: boolean;
  isDrinking?: boolean;
  isChild?: boolean;
  isElderly?: boolean;
  chronicDiseases?: string[];
} | null | undefined) {
  const badges: string[] = [];

  if (!patientInfo) return badges;

  if (patientInfo.isPregnant) badges.push('임신');
  if (patientInfo.isBreastfeeding) badges.push('수유');
  if (patientInfo.isSmoking) badges.push('흡연');
  if (patientInfo.isDrinking) badges.push('음주');
  if (patientInfo.isChild) badges.push('소아');
  if (patientInfo.isElderly) badges.push('고령');

  if (patientInfo.chronicDiseases?.length) {
    badges.push(...patientInfo.chronicDiseases);
  }

  return badges;
}

function ConsultPage() {
  const consultMessagesContainerRef = useRef<HTMLDivElement | null>(null);

  const [activeStatus, setActiveStatus] = useState<ConsultTabStatus>('PENDING');
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
  const [answerText, setAnswerText] = useState('');
  const [socketMessages, setSocketMessages] = useState<ConsultMessage[]>([]);

  const {
    data: pendingRooms = [],
    isLoading: isPendingRoomsLoading,
    isError: isPendingRoomsError,
  } = usePendingConsultRooms();

  const {
    data: activeRooms = [],
    isLoading: isActiveRoomsLoading,
    isError: isActiveRoomsError,
  } = useActiveConsultRooms();

  const {
    data: completedRooms = [],
    isLoading: isCompletedRoomsLoading,
    isError: isCompletedRoomsError,
  } = useCompletedConsultRooms();

  const matchConsultRoomMutation = useMatchConsultRoom();
  const closeConsultRoomMutation = useCloseConsultRoom();

  const generateConsultSummaryMutation = useGenerateConsultSummary();

  const roomsByStatus = useMemo(() => {
    if (activeStatus === 'PENDING') return pendingRooms;
    if (activeStatus === 'ACTIVE') return activeRooms;
    return completedRooms;
  }, [activeStatus, pendingRooms, activeRooms, completedRooms]);

  const selectedRoom = useMemo(() => {
    return (
      [...pendingRooms, ...activeRooms, ...completedRooms].find(
        (room) => room.roomId === selectedRoomId,
      ) ??
      roomsByStatus[0] ??
      null
    );
  }, [pendingRooms, activeRooms, completedRooms, roomsByStatus, selectedRoomId]);

  const isSelectedRoomMatched =
    selectedRoom?.status === 'MATCHED' || selectedRoom?.status === 'ACTIVE';

  const isSelectedRoomClosed =
    selectedRoom?.status === 'COMPLETED' || selectedRoom?.status === 'CLOSED';

  const {
    data: messages = [],
    isLoading: isMessagesLoading,
    isError: isMessagesError,
  } = useConsultMessages(selectedRoom?.roomId ?? null);

  const {
    data: patientInfo,
    isLoading: isPatientInfoLoading,
    isError: isPatientInfoError,
  } = useConsultPatientInfo(selectedRoom?.roomId ?? null);

  const isLoading =
    isPendingRoomsLoading || isActiveRoomsLoading || isCompletedRoomsLoading;

  const isError =
    isPendingRoomsError || isActiveRoomsError || isCompletedRoomsError;

  const handleReceiveSocketMessage = useCallback(
    (socketMessage: ConsultSocketMessage) => {
      if (socketMessage.type !== 'TALK') {
        return;
      }

      // 약사가 보낸 메시지는 전송 직후 optimistic append로 이미 표시함
      if (socketMessage.senderType === 'PHARMACIST') {
        return;
      }

      setSocketMessages((prev) => [
        ...prev,
        {
          type: socketMessage.type,
          roomId: socketMessage.roomId,
          senderId: socketMessage.senderId,
          senderType: socketMessage.senderType,
          message: socketMessage.message,
          content: socketMessage.message,
          createdAt: new Date().toISOString(),
        },
      ]);
    },
    [],
  );

  const {
    isConnected: isConsultSocketConnected,
    sendMessage: sendConsultSocketMessage,
  } = useConsultSocket({
    roomId: selectedRoom?.roomId,
    senderType: 'PHARMACIST',
    senderName: '약사',
    enabled: Boolean(selectedRoom) && isSelectedRoomMatched,
    onMessage: handleReceiveSocketMessage,
  });

  const handleSelectRoom = (roomId: number) => {
    setSelectedRoomId(roomId);
    setAnswerText('');
  };

  const handleChangeStatus = (status: ConsultTabStatus) => {
    setActiveStatus(status);

    const nextRooms =
      status === 'PENDING'
        ? pendingRooms
        : status === 'ACTIVE'
          ? activeRooms
          : completedRooms;

    setSelectedRoomId(nextRooms[0]?.roomId ?? null);
    setAnswerText('');
  };

  const handleMatchRoom = async () => {
    if (!selectedRoom) return;

    try {
      await matchConsultRoomMutation.mutateAsync(selectedRoom.roomId);
      setActiveStatus('ACTIVE');
      setAnswerText('');
      toast.success('상담 요청을 수락했습니다.');
    } catch (error) {
      console.error('상담 요청 수락 실패:', error);
      toast.error('상담 요청을 수락하지 못했습니다.');
    }
  };

  const handleCloseRoom = async () => {
    if (!selectedRoom) return;

    try {
      await closeConsultRoomMutation.mutateAsync(selectedRoom.roomId);
      setActiveStatus('COMPLETED');
      setAnswerText('');
      toast.success('상담이 종료되었습니다.');
    } catch (error) {
      console.error('상담 종료 실패:', error);
      toast.error('상담 종료에 실패했습니다.');
    }
  };

  const handleGenerateConsultSummary = () => {
    if (!selectedRoom?.roomId) {
      return;
    }

    generateConsultSummaryMutation.mutate(selectedRoom.roomId, {
      onSuccess: () => {
        toast.success('상담 요약이 생성되었습니다.');
      },
      onError: (error) => {
        console.error('상담 요약 생성 실패:', error);
        toast.error('상담 요약 생성에 실패했습니다.');
      },
    });
  };

  const handleSubmitAnswer = () => {
    const trimmedAnswer = answerText.trim();

    if (!trimmedAnswer || !selectedRoom) {
      return;
    }

    if (!isSelectedRoomMatched) {
      toast.error('상담 수락 후 답변을 전송할 수 있습니다.');
      return;
    }

    const isSent = sendConsultSocketMessage(trimmedAnswer);

    if (!isSent) {
      toast.error('상담 서버에 연결되지 않았습니다.');
      return;
    }

    setSocketMessages((prev) => [
      ...prev,
      {
        type: 'TALK',
        roomId: selectedRoom.roomId,
        senderId: 0,
        senderType: 'PHARMACIST',
        message: trimmedAnswer,
        content: trimmedAnswer,
        createdAt: new Date().toISOString(),
      },
    ]);

    setAnswerText('');
  };

  const selectedRoomRoomId = selectedRoom?.roomId ?? null;

  const displayedMessages = useMemo(() => {
    if (!selectedRoomRoomId) {
      return [];
    }

    const serverMessages = messages.map((message) => ({
      ...message,
      roomId: message.roomId ?? selectedRoomRoomId,
    }));

    const socketMessagesInRoom = socketMessages.filter((message) => {
      return message.roomId === selectedRoomRoomId;
    });

    return [...serverMessages, ...socketMessagesInRoom].sort((a, b) => {
      return getConsultMessageSortTime(a) - getConsultMessageSortTime(b);
    });
  }, [messages, selectedRoomRoomId, socketMessages]);

  const lastDisplayedMessageKey =
    displayedMessages.length > 0
      ? `${
          displayedMessages[displayedMessages.length - 1].messageId ??
          displayedMessages[displayedMessages.length - 1].createdAt
        }-${
          displayedMessages[displayedMessages.length - 1].content ??
          displayedMessages[displayedMessages.length - 1].message
        }`
      : '';

  useEffect(() => {
    const container = consultMessagesContainerRef.current;

    if (!container) {
      return;
    }

    window.requestAnimationFrame(() => {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth',
      });
    });
  }, [lastDisplayedMessageKey, selectedRoomRoomId]);

  const patientHealthBadges = getPatientHealthBadges(patientInfo);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-blue-600">
          Pharmacist Consult
        </p>

        <h1 className="mt-2 text-3xl font-bold text-slate-900">상담 관리</h1>

        <p className="mt-2 text-slate-500">
          환자가 요청한 복약 상담을 확인하고 답변을 작성합니다.
        </p>
      </div>

      {isError && (
        <Card className="border-red-100 bg-red-50">
          <p className="text-sm font-semibold text-red-700">
            상담 목록을 불러오지 못했습니다.
          </p>
          <p className="mt-1 text-sm text-red-600">
            상담 서버 실행 상태와 약사 권한을 확인해주세요.
          </p>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-sm font-medium text-slate-500">상담 대기</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">
            {isLoading ? '-' : `${pendingRooms.length}건`}
          </p>
        </Card>

        <Card>
          <p className="text-sm font-medium text-slate-500">진행 중</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">
            {isLoading ? '-' : `${activeRooms.length}건`}
          </p>
        </Card>

        <Card>
          <p className="text-sm font-medium text-slate-500">완료</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">
            {isLoading ? '-' : `${completedRooms.length}건`}
          </p>
        </Card>
      </div>

      <Card>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleChangeStatus('PENDING')}
            className={[
              'rounded-xl px-4 py-2 text-sm font-semibold transition',
              activeStatus === 'PENDING'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
            ].join(' ')}
          >
            대기
          </button>

          <button
            type="button"
            onClick={() => handleChangeStatus('ACTIVE')}
            className={[
              'rounded-xl px-4 py-2 text-sm font-semibold transition',
              activeStatus === 'ACTIVE'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
            ].join(' ')}
          >
            진행 중
          </button>

          <button
            type="button"
            onClick={() => handleChangeStatus('COMPLETED')}
            className={[
              'rounded-xl px-4 py-2 text-sm font-semibold transition',
              activeStatus === 'COMPLETED'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
            ].join(' ')}
          >
            완료
          </button>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
        <Card>
          <div>
            <h2 className="text-xl font-bold text-slate-900">상담 목록</h2>
            <p className="mt-1 text-sm text-slate-500">
              선택한 상태의 상담 요청을 확인합니다.
            </p>
          </div>

          <div className="mt-4 space-y-3">
            {isLoading ? (
              <div className="rounded-2xl bg-slate-50 p-6 text-center text-sm text-slate-500">
                상담 목록을 불러오는 중입니다.
              </div>
            ) : roomsByStatus.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 p-6 text-center text-sm text-slate-500">
                해당 상태의 상담이 없습니다.
              </div>
            ) : (
              roomsByStatus.map((room) => {
                const isSelected = selectedRoom?.roomId === room.roomId;

                return (
                  <button
                    key={room.roomId}
                    type="button"
                    onClick={() => handleSelectRoom(room.roomId)}
                    className={[
                      'block w-full rounded-2xl border p-4 text-left transition',
                      isSelected
                        ? 'border-blue-300 bg-blue-50'
                        : 'border-slate-200 hover:border-blue-200 hover:bg-blue-50/40',
                    ].join(' ')}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-slate-900">
                        {getPatientName(room)}
                      </p>

                      <Badge variant={getConsultStatusBadge(room.status)}>
                        {getConsultStatusLabel(room.status)}
                      </Badge>
                    </div>

                    <p className="mt-2 line-clamp-2 font-semibold text-slate-800">
                      {getConsultTitle(room)}
                    </p>

                    <p className="mt-2 text-xs text-slate-400">
                      요청일시: {formatDateTime(room.createdAt)}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </Card>

        <Card>
          {selectedRoom ? (
            <div className="space-y-5">
              <div className="flex flex-col gap-3 border-b border-slate-100 pb-5 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-2xl font-bold text-slate-900">
                      {getConsultTitle(selectedRoom)}
                    </h2>

                    <Badge variant={getConsultStatusBadge(selectedRoom.status)}>
                      {getConsultStatusLabel(selectedRoom.status)}
                    </Badge>
                  </div>

                  <p className="mt-2 text-sm text-slate-500">
                    {getPatientName(selectedRoom)} · 요청일시{' '}
                    {formatDateTime(selectedRoom.createdAt)}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {selectedRoom.status === 'PENDING' && (
                    <button
                      type="button"
                      onClick={handleMatchRoom}
                      disabled={matchConsultRoomMutation.isPending}
                      className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {matchConsultRoomMutation.isPending
                        ? '수락 중'
                        : '상담 수락'}
                    </button>
                  )}

                  {(selectedRoom.status === 'MATCHED' || selectedRoom.status === 'ACTIVE') && (
                    <button
                      type="button"
                      onClick={handleCloseRoom}
                      disabled={closeConsultRoomMutation.isPending}
                      className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {closeConsultRoomMutation.isPending ? '종료 중' : '상담 종료'}
                    </button>
                  )}
                </div>
              </div>

              <section>
                <h3 className="text-sm font-semibold text-slate-500">
                  상담 메시지
                </h3>

                <div
                  ref={consultMessagesContainerRef}
                  className="mt-2 h-80 overflow-y-auto rounded-2xl bg-slate-50 p-4"
                >
                  <div className="space-y-3">
                    {isMessagesLoading ? (
                      <p className="text-sm text-slate-500">
                        메시지를 불러오는 중입니다.
                      </p>
                    ) : isMessagesError ? (
                      <p className="text-sm text-red-600">
                        메시지를 불러오지 못했습니다.
                      </p>
                    ) : displayedMessages.length === 0 ? (
                      <p className="text-sm text-slate-500">
                        아직 표시할 메시지가 없습니다.
                      </p>
                    ) : (
                      displayedMessages.map((message, index) => (
                        <div
                          key={
                            message.messageId ??
                            `${message.roomId ?? selectedRoom?.roomId}-${message.senderId}-${
                              message.createdAt ?? index
                            }-${index}`
                          }
                          className="rounded-2xl bg-white p-3"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge
                              variant={
                                message.senderType === 'PHARMACIST' ? 'blue' : 'gray'
                              }
                            >
                              {message.senderType === 'PHARMACIST' ? '약사' : '환자'}
                            </Badge>

                            <span className="text-xs text-slate-400">
                              {formatDateTime(message.createdAt)}
                            </span>
                          </div>

                          <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">
                            {getConsultMessageContent(message)}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </section>

              <section className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 p-4">
                  <h3 className="text-sm font-semibold text-slate-500">
                    환자 정보
                  </h3>

                  {isPatientInfoLoading ? (
                    <p className="mt-2 text-sm text-slate-500">
                      환자 정보를 불러오는 중입니다.
                    </p>
                  ) : isPatientInfoError ? (
                    <p className="mt-2 text-sm text-red-600">
                      환자 정보를 불러오지 못했습니다.
                    </p>
                  ) : (
                    <div className="mt-2 space-y-2 text-sm text-slate-700">
                      <p>이름: {getPatientDisplayName(patientInfo)}</p>
                      <p>성별: {patientInfo?.gender ?? '-'}</p>
                      <p>생년월일: {patientInfo?.birthDate ?? '-'}</p>
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-200 p-4">
                  <h3 className="text-sm font-semibold text-slate-500">
                    건강 정보 참고
                  </h3>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {patientHealthBadges.length === 0 ? (
                      <Badge variant="gray">특이사항 없음</Badge>
                    ) : (
                      patientHealthBadges.map((badge) => (
                        <Badge key={badge} variant="red">
                          {badge}
                        </Badge>
                      ))
                    )}
                  </div>
                </div>
              </section>

              {isSelectedRoomClosed && (
                <section className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <h3 className="text-sm font-semibold text-slate-500">
                      상담 요약
                    </h3>

                    <div className="mt-2 space-y-3">
                      <p className="whitespace-pre-line text-sm leading-6 text-slate-700">
                        {selectedRoom.aiConsultationSummary ||
                          '아직 생성된 상담 요약이 없습니다.'}
                      </p>

                      {!selectedRoom.aiConsultationSummary && (
                        <button
                          type="button"
                          onClick={handleGenerateConsultSummary}
                          disabled={generateConsultSummaryMutation.isPending}
                          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {generateConsultSummaryMutation.isPending
                            ? '요약 생성 중'
                            : 'AI 상담 요약 생성'}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 p-4">
                    <h3 className="text-sm font-semibold text-slate-500">
                      사용자 평가
                    </h3>

                    <p className="mt-2 text-sm font-bold text-yellow-500">
                      {getRatingStars(selectedRoom.rating)}
                    </p>

                    <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">
                      {selectedRoom.feedbackComment || '아직 등록된 한줄평이 없습니다.'}
                    </p>
                  </div>
                </section>
              )}

              {isSelectedRoomClosed ? (
                <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                  종료된 상담입니다. 메시지를 추가로 전송할 수 없습니다.
                </div>
              ) : (
                <section>
                  <h3 className="text-sm font-semibold text-slate-500">
                    답변 작성
                  </h3>

                  <textarea
                    value={answerText}
                    onChange={(event) => setAnswerText(event.target.value)}
                    onKeyDown={(event) => {
                      if (
                        event.key !== 'Enter' ||
                        event.shiftKey ||
                        event.nativeEvent.isComposing
                      ) {
                        return;
                      }

                      event.preventDefault();
                      handleSubmitAnswer();
                    }}
                    placeholder="환자에게 전달할 상담 답변을 입력하세요."
                    className="mt-2 min-h-40 w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                  />

                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={handleSubmitAnswer}
                      disabled={
                        !answerText.trim() ||
                        !isSelectedRoomMatched ||
                        !isConsultSocketConnected
                      }
                      className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isConsultSocketConnected ? '답변 전송' : '연결 중'}
                    </button>
                  </div>
                </section>
              )}
            </div>
          ) : (
            <div className="rounded-2xl bg-slate-50 p-8 text-center text-sm text-slate-500">
              상담 목록에서 상담을 선택해주세요.
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

export default ConsultPage;
