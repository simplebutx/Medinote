import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

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
import type { CautionItem, CautionReason } from '../../features/user/types/caution.types';

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

function getGenderLabel(gender?: string | null) {
  if (gender === 'MALE') return '남성';
  if (gender === 'FEMALE') return '여성';
  return '-';
}

function calcKoreanAge(birthDate?: string | null) {
  if (!birthDate) return null;
  const today = new Date();
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return null;
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function formatMessageTime(value?: string) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

const CAUTION_REASON_LABELS: Record<CautionReason, string> = {
  ALLERGY: '알레르기',
  SIDE_EFFECT: '부작용',
  DOCTOR_ADVICE: '의사 권고',
  PHARMACIST_ADVICE: '약사 권고',
  PERSONAL_AVOID: '개인 회피',
  OTHER: '기타',
};

function getCautionReasonLabel(reason: CautionReason): string {
  return CAUTION_REASON_LABELS[reason] ?? reason;
}

function getCautionName(caution: CautionItem): string {
  return caution.itemName ?? caution.ingredientName ?? '알 수 없음';
}

const DOSAGE_UNIT_LABEL: Record<string, string> = {
  TABLET: '정', CAPSULE: '캡슐', PACK: '포', ML: 'ml', MG: 'mg', DROP: '방울', OTHER: '',
};

function formatDosageUnit(unit: string | null | undefined): string {
  if (!unit) return '';
  return DOSAGE_UNIT_LABEL[unit] ?? unit;
}

function getMedicationName(schedule: { hospitalName?: string | null; pharmacyName?: string | null; customMedicineName?: string | null; medicines?: { customMedicineName?: string | null }[] }): string {
  if (schedule.hospitalName) return `${schedule.hospitalName} 처방`;
  if (schedule.pharmacyName) return `${schedule.pharmacyName} 조제`;
  const medicines = schedule.medicines ?? [];
  if (medicines.length > 0) {
    const firstName = medicines[0].customMedicineName ?? schedule.customMedicineName ?? '복약 정보';
    return medicines.length === 1 ? firstName : `${firstName} 외${medicines.length - 1}`;
  }
  return schedule.customMedicineName ?? '복약 정보';
}

function getMedicationPeriod(schedule: { startDate?: string | null; endDate?: string | null }): string {
  if (schedule.startDate && schedule.endDate) return `${schedule.startDate} ~ ${schedule.endDate}`;
  if (schedule.startDate) return `${schedule.startDate} ~`;
  return '-';
}

function isMedicationActive(schedule: { endDate?: string | null }): boolean {
  const endDate = schedule.endDate;
  if (!endDate) return true;
  const end = new Date(endDate);
  if (Number.isNaN(end.getTime())) return true;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return end >= today;
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
  const navigate = useNavigate();
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

  const medicationSchedules = [...(patientInfo?.medicationSchedules ?? [])].sort(
    (a, b) => (b.startDate ?? '').localeCompare(a.startDate ?? '')
  );
  const activeMedications = medicationSchedules.filter(isMedicationActive);
  const pastMedications   = medicationSchedules.filter((s) => !isMedicationActive(s));

  return (
    <div className="space-y-6">
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
          <p className="mt-3 text-3xl font-bold text-yellow-500">
            {isLoading ? '-' : `${pendingRooms.length}건`}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            아직 답변이 필요한 상담 요청입니다.
          </p>
        </Card>

        <Card>
          <p className="text-sm font-medium text-slate-500">진행 중</p>
          <p className="mt-3 text-3xl font-bold text-emerald-600">
            {isLoading ? '-' : `${activeRooms.length}건`}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            확인 또는 답변 작성 중인 상담입니다.
          </p>
        </Card>

        <Card>
          <p className="text-sm font-medium text-slate-500">완료</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">
            {isLoading ? '-' : `${completedRooms.length}건`}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            답변이 종료된 상담 내역입니다.
          </p>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Card>
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-xl font-bold text-slate-900">상담 목록</h2>

            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => handleChangeStatus('PENDING')}
                className={[
                  'rounded-xl px-3 py-1.5 text-xs font-semibold transition',
                  activeStatus === 'PENDING'
                    ? 'bg-emerald-700 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                ].join(' ')}
              >
                대기
              </button>

              <button
                type="button"
                onClick={() => handleChangeStatus('ACTIVE')}
                className={[
                  'rounded-xl px-3 py-1.5 text-xs font-semibold transition',
                  activeStatus === 'ACTIVE'
                    ? 'bg-emerald-700 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                ].join(' ')}
              >
                진행 중
              </button>

              <button
                type="button"
                onClick={() => handleChangeStatus('COMPLETED')}
                className={[
                  'rounded-xl px-3 py-1.5 text-xs font-semibold transition',
                  activeStatus === 'COMPLETED'
                    ? 'bg-emerald-700 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                ].join(' ')}
              >
                완료
              </button>
            </div>
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
                        ? 'border-emerald-300 bg-emerald-50'
                        : 'border-slate-200 hover:border-emerald-200 hover:bg-emerald-50/40',
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

                    <p className="mt-2 truncate text-slate-600">
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
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-2">
                    <h2 className="truncate text-lg font-bold text-slate-900">
                      {getConsultTitle(selectedRoom)}
                    </h2>
                  </div>

                  <p className="mt-2 text-sm text-slate-500">
                    {getPatientName(selectedRoom)} · 요청일시{' '}
                    {formatDateTime(selectedRoom.createdAt)}
                  </p>
                </div>

                <div className="flex shrink-0 gap-2">
                  {selectedRoom.status === 'PENDING' && (
                    <button
                      type="button"
                      onClick={handleMatchRoom}
                      disabled={matchConsultRoomMutation.isPending}
                      className="whitespace-nowrap rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {matchConsultRoomMutation.isPending ? '수락 중' : '상담 수락'}
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

              {/* ── 환자 정보 띠 + 채팅창 + 답변 작성 (좁은 간격으로 묶음) ── */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => navigate(`/pharmacist/patients?roomId=${selectedRoom.roomId}`)}
                  className="w-full rounded-2xl bg-slate-50 px-5 py-3 text-left transition hover:bg-emerald-50 hover:ring-1 hover:ring-emerald-200"
                >
                  {isPatientInfoLoading ? (
                    <p className="text-sm text-slate-500">환자 정보를 불러오는 중입니다.</p>
                  ) : isPatientInfoError ? (
                    <p className="text-sm text-red-600">환자 정보를 불러오지 못했습니다.</p>
                  ) : (
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                      <span className="flex items-center gap-1 font-semibold text-slate-900">
                        {getPatientDisplayName(patientInfo)}
                        <span className="text-xs font-normal text-emerald-600">↗</span>
                      </span>
                      <span className="text-slate-500">{getGenderLabel(patientInfo?.gender)}</span>
                      <span className="text-slate-500">
                        {patientInfo?.birthDate ?? '-'}
                        {(() => { const age = calcKoreanAge(patientInfo?.birthDate); return age != null ? ` (만 ${age}세)` : ''; })()}
                      </span>
                      {patientHealthBadges.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {patientHealthBadges.map((badge) => (
                            <Badge key={badge} variant="red">{badge}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </button>

                {/* ── 채팅창 ── */}
                <div
                  ref={consultMessagesContainerRef}
                  className="h-96 overflow-y-auto rounded-2xl bg-slate-50 p-4"
                >
                  <div className="space-y-4">
                    {isMessagesLoading ? (
                      <p className="text-sm text-slate-500">메시지를 불러오는 중입니다.</p>
                    ) : isMessagesError ? (
                      <p className="text-sm text-red-600">메시지를 불러오지 못했습니다.</p>
                    ) : displayedMessages.length === 0 ? (
                      <p className="text-sm text-slate-500">아직 표시할 메시지가 없습니다.</p>
                    ) : (
                      displayedMessages.map((message, index) => {
                        const isPharmacist = message.senderType === 'PHARMACIST';
                        return (
                          <div
                            key={
                              message.messageId ??
                              `${message.roomId ?? selectedRoom?.roomId}-${message.senderId}-${message.createdAt ?? index}-${index}`
                            }
                            className={['flex flex-col', isPharmacist ? 'items-end' : 'items-start'].join(' ')}
                          >
                            {!isPharmacist && (
                              <span className="mb-1 text-xs font-semibold text-slate-500">
                                {`${getPatientName(selectedRoom)} 환자`}
                              </span>
                            )}
                            <div className={[
                              'max-w-[80%] px-4 py-2.5 text-sm leading-6 whitespace-pre-line',
                              isPharmacist
                                ? 'rounded-tl-2xl rounded-bl-2xl rounded-br-2xl rounded-tr-none bg-emerald-600 text-white'
                                : 'rounded-tr-2xl rounded-bl-2xl rounded-br-2xl rounded-tl-none bg-blue-600 text-white',
                            ].join(' ')}>
                              {getConsultMessageContent(message)}
                            </div>
                            <span className="mt-1 text-xs text-slate-400">{formatMessageTime(message.createdAt)}</span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* ── 답변 작성 ── */}
                {isSelectedRoomClosed ? (
                  <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500">
                    종료된 상담입니다. 메시지를 추가로 전송할 수 없습니다.
                  </div>
                ) : selectedRoom.status === 'PENDING' ? null : (
                  <section>
                    <textarea
                      value={answerText}
                      onChange={(event) => setAnswerText(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return;
                        event.preventDefault();
                        handleSubmitAnswer();
                      }}
                      placeholder="환자에게 전달할 상담 답변을 입력하세요."
                      className="min-h-40 w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                    />
                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={handleSubmitAnswer}
                      disabled={!answerText.trim() || !isSelectedRoomMatched}
                      className="rounded-xl bg-emerald-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      답변 전송
                    </button>
                  </div>
                  </section>
                )}
              </div>

              {/* ── 알레르기/주의 성분 (단독 full-width) ── */}
              <div className="rounded-2xl bg-slate-50 p-4">
                <h3 className="text-sm font-semibold text-slate-500">알레르기/주의 성분</h3>
                <div className="mt-3">
                  {!patientInfo?.medicationCautions || patientInfo.medicationCautions.length === 0 ? (
                    <Badge variant="gray">해당 없음</Badge>
                  ) : (
                    <div className="flex flex-wrap gap-x-6 gap-y-2 max-h-[160px] overflow-y-auto">
                      {patientInfo.medicationCautions.map((caution) => (
                        <div key={caution.id} className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-slate-800">{getCautionName(caution)}</span>
                          <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-700">
                            {getCautionReasonLabel(caution.reason)}
                          </span>
                          {caution.memo && <span className="text-xs text-slate-400">{caution.memo}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* ── 현재 복약 중 | 복약 이력 ── */}
              <section className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <h3 className="text-sm font-semibold text-slate-500">현재 복약 중</h3>
                  <div className={['mt-3 space-y-2', activeMedications.length > 2 ? 'max-h-[260px] overflow-y-auto pr-1' : ''].join(' ')}>
                    {activeMedications.length === 0 ? (
                      <p className="text-sm text-slate-400">복약 중인 약이 없습니다.</p>
                    ) : (
                      activeMedications.map((schedule, i) => (
                        <div key={i} className="rounded-xl bg-white border border-slate-200 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-slate-800">{getMedicationName(schedule)}</p>
                            <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">복약 중</span>
                          </div>
                          {schedule.medicines && schedule.medicines.length > 0 && (
                            <ul className="mt-1.5 space-y-0.5">
                              {schedule.medicines.map((medicine, mi) => (
                                <li key={mi} className="text-xs text-slate-600">
                                  {medicine.customMedicineName ?? '-'}
                                  {medicine.dosageAmount != null && (
                                    <span className="ml-1 text-slate-400">{medicine.dosageAmount}{formatDosageUnit(medicine.dosageUnit)}</span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          )}
                          <p className="mt-1.5 text-xs text-slate-400">복용 기간: {getMedicationPeriod(schedule)}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <h3 className="text-sm font-semibold text-slate-500">복약 이력</h3>
                  <div className={['mt-3 space-y-2', pastMedications.length > 2 ? 'max-h-[260px] overflow-y-auto pr-1' : ''].join(' ')}>
                    {pastMedications.length === 0 ? (
                      <p className="text-sm text-slate-400">복약 이력이 없습니다.</p>
                    ) : (
                      pastMedications.map((schedule, i) => (
                        <div key={i} className="rounded-xl bg-white border border-slate-200 p-3">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-slate-800">{getMedicationName(schedule)}</p>
                            <span className="shrink-0 rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-500">완료</span>
                          </div>
                          {schedule.medicines && schedule.medicines.length > 0 && (
                            <ul className="mt-1.5 space-y-0.5">
                              {schedule.medicines.map((medicine, mi) => (
                                <li key={mi} className="text-xs text-slate-600">
                                  {medicine.customMedicineName ?? '-'}
                                  {medicine.dosageAmount != null && (
                                    <span className="ml-1 text-slate-400">{medicine.dosageAmount}{formatDosageUnit(medicine.dosageUnit)}</span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          )}
                          <p className="mt-1.5 text-xs text-slate-400">복용 기간: {getMedicationPeriod(schedule)}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </section>

              {/* ── 상담 요약 / 사용자 평가 (종료 후) ── */}
              {isSelectedRoomClosed && (
                <section className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <h3 className="text-sm font-semibold text-slate-500">상담 요약</h3>
                    <div className="mt-2 space-y-3">
                      <p className="whitespace-pre-line text-sm leading-6 text-slate-700">
                        {selectedRoom.aiConsultationSummary || '아직 생성된 상담 요약이 없습니다.'}
                      </p>
                      {!selectedRoom.aiConsultationSummary && (
                        <button
                          type="button"
                          onClick={handleGenerateConsultSummary}
                          disabled={generateConsultSummaryMutation.isPending}
                          className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {generateConsultSummaryMutation.isPending ? '요약 생성 중' : 'AI 상담 요약 생성'}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <h3 className="text-sm font-semibold text-slate-500">사용자 평가</h3>
                    <p className="mt-2 text-sm font-bold text-yellow-500">{getRatingStars(selectedRoom.rating)}</p>
                    <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">
                      {selectedRoom.feedbackComment || '아직 등록된 한줄평이 없습니다.'}
                    </p>
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
