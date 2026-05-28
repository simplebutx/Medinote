import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Badge, Button, Card } from '../../components/ui';
import {
  useCreateMedicationIntakeLog,
  useDeleteMedicationIntakeLog,
  useMedicationIntakeLogsByScheduleIds,
  useMedicationSchedules,
  useMedicationScheduleTimesByScheduleIds,
  useUpdateMedicationIntakeLog,
} from '../../features/schedule/hooks';


type MedicationStatus = 'PENDING' | 'TAKEN' | 'SKIPPED' | 'MISSED';

interface TodayMedication {
  id: number;
  drugName: string;
  dosage: string;
  time: string;
  timing: string;
  status: MedicationStatus;
  source?: 'MOCK' | 'SERVER';
  medicationScheduleId?: number;
  medicationScheduleTimeId?: number;
  scheduledAt?: string;
  intakeLogId?: number;
}

const initialTodayMedications: TodayMedication[] = [
  {
    id: 1,
    drugName: '아스피린 100mg',
    dosage: '1정',
    time: '08:00',
    timing: '식후',
    status: 'TAKEN',
  },
  {
    id: 2,
    drugName: '암로디핀 5mg',
    dosage: '1정',
    time: '13:00',
    timing: '식후',
    status: 'PENDING',
  },
  {
    id: 3,
    drugName: '타이레놀 500mg',
    dosage: '1정',
    time: '20:00',
    timing: '필요 시',
    status: 'PENDING',
  },
];

function getStatusBadge(status: MedicationStatus) {
  if (status === 'TAKEN') {
    return <Badge variant="green">복용 완료</Badge>;
  }

  if (status === 'SKIPPED') {
    return <Badge variant="yellow">건너뜀</Badge>;
  }

  if (status === 'MISSED') {
    return <Badge variant="red">누락</Badge>;
  }

  return <Badge variant="gray">예정</Badge>;
}

const today = new Date();

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function parseDateText(dateText: string) {
  const [year, month, day] = dateText.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function getWeekDates(baseDateText: string) {
  const baseDate = parseDateText(baseDateText);
  const day = baseDate.getDay();

  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(baseDate);

  monday.setDate(baseDate.getDate() + mondayOffset);

  const labels = ['월', '화', '수', '목', '금', '토', '일'];

  return labels.map((label, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);

    return {
      day: label,
      date: formatDate(date),
    };
  });
}

function getIntakeStatusLabel(status: MedicationStatus) {
  if (status === 'TAKEN') return '복용 완료';
  if (status === 'SKIPPED') return '건너뜀';
  if (status === 'MISSED') return '누락';
  return '예정';
}

function formatDateTimeLocal(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

function buildScheduledAt(dateText: string, takeTime: string) {
  const normalizedTime = takeTime.length === 5 ? `${takeTime}:00` : takeTime;

  return `${dateText}T${normalizedTime}`;
}

function getMonthDays(baseDate: Date) {
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();

  const firstDate = new Date(year, month, 1);
  const lastDate = new Date(year, month + 1, 0);

  const startDay = firstDate.getDay();
  const totalDays = lastDate.getDate();

  const emptyDays = Array.from({ length: startDay }, (_, index) => ({
    key: `empty-${index}`,
    date: '',
    day: '',
  }));

  const days = Array.from({ length: totalDays }, (_, index) => {
    const date = new Date(year, month, index + 1);

    return {
      key: formatDate(date),
      date: formatDate(date),
      day: String(index + 1),
    };
  });

  return [...emptyDays, ...days];
}

function getCalendarDayClass(rate: number | null) {
  if (rate === null) {
    return 'bg-slate-50 text-slate-400';
  }

  if (rate >= 80) {
    return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200';
  }

  if (rate >= 50) {
    return 'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200';
  }

  return 'bg-red-50 text-red-700 ring-1 ring-red-200';
}

function SchedulePage() {
  const navigate = useNavigate();
  const handleMoveDrugSearch = (drugName: string) => {
    navigate(`/app/drugs?keyword=${encodeURIComponent(drugName)}`);
  };
  const todayText = formatDate(today);
  const [selectedDate, setSelectedDate] = useState(todayText);
  const [calendarBaseDate, setCalendarBaseDate] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );

  const {
    data: medicationSchedules = [],
    isLoading: isMedicationScheduleLoading,
    isError: isMedicationScheduleError,
  } = useMedicationSchedules();

  const medicationScheduleIds = useMemo(
    () => medicationSchedules.map((schedule) => schedule.id),
    [medicationSchedules],
  );

  const {
    data: medicationIntakeLogs = [],
    isLoading: isMedicationIntakeLogLoading,
    isError: isMedicationIntakeLogError,
  } = useMedicationIntakeLogsByScheduleIds(medicationScheduleIds);

  const {
    data: medicationScheduleTimes = [],
    isLoading: isMedicationScheduleTimeLoading,
    isError: isMedicationScheduleTimeError,
  } = useMedicationScheduleTimesByScheduleIds(medicationScheduleIds);

  const createIntakeLogMutation = useCreateMedicationIntakeLog();
  const deleteIntakeLogMutation = useDeleteMedicationIntakeLog();
  const updateIntakeLogMutation = useUpdateMedicationIntakeLog();

  const [localIntakeLogMap, setLocalIntakeLogMap] = useState<
    Record<
      string,
      {
        status: MedicationStatus;
        intakeLogId: number;
      }
    >
  >({});

  const getIntakeStatusKey = (
    medicationScheduleId: number,
    medicationScheduleTimeId: number,
    dateText: string,
  ) => {
    return `${medicationScheduleId}-${medicationScheduleTimeId}-${dateText}`;
  };

  const activeMedicationScheduleCount = medicationSchedules.filter(
    (schedule) => schedule.isActive,
  ).length;

  const [medicationsByDate, setMedicationsByDate] = useState<
    Record<string, TodayMedication[]>
  >(() => ({
    [todayText]: initialTodayMedications,

    '2026-05-20': initialTodayMedications.map((item) => ({
      ...item,
      status: 'TAKEN',
    })),

    '2026-05-21': initialTodayMedications.map((item, index) => ({
      ...item,
      status: index === 2 ? 'PENDING' : 'TAKEN',
    })),

    '2026-05-22': initialTodayMedications.map((item) => ({
      ...item,
      status: 'TAKEN',
    })),

    '2026-05-23': initialTodayMedications.map((item, index) => ({
      ...item,
      status: index === 0 ? 'TAKEN' : 'PENDING',
    })),

    '2026-05-24': initialTodayMedications.map((item, index) => ({
      ...item,
      status: index === 0 ? 'TAKEN' : 'SKIPPED',
    })),

    '2026-05-25': initialTodayMedications.map((item, index) => ({
      ...item,
      status: index === 0 || index === 1 ? 'TAKEN' : 'PENDING',
    })),
  }));

  function getTimingLabel(timing: string) {
    if (timing === 'AFTER_MEAL') return '식후';
    if (timing === 'BEFORE_MEAL') return '식전';
    if (timing === 'WITH_MEAL') return '식사 중';
    if (timing === 'EMPTY_STOMACH') return '공복';
    if (timing === 'BEDTIME') return '취침 전';
    return '상관없음';
  }

  function getDosageLabel(amount?: number | null, unit?: string | null) {
    if (!amount && !unit) return '복용량 미정';

    return `${amount ?? ''}${unit ?? ''}`;
  }

  function isDateInScheduleRange(
    selectedDateText: string,
    startDate?: string | null,
    endDate?: string | null,
  ) {
    if (!startDate || !endDate) {
      return false;
    }

    return selectedDateText >= startDate && selectedDateText <= endDate;
  }

  const getServerMedicationsByDate = useCallback(
    (dateText: string): TodayMedication[] => {
      return medicationSchedules
        .filter(
          (schedule) =>
            schedule.isActive &&
            isDateInScheduleRange(dateText, schedule.startDate, schedule.endDate),
        )
        .flatMap((schedule) => {
          const times = medicationScheduleTimes.filter(
            (time) => time.medicationScheduleId === schedule.id,
          );

          return times.map((time) => {
            const statusKey = getIntakeStatusKey(schedule.id, time.id, dateText);

            const matchedLog = medicationIntakeLogs.find(
              (log) =>
                log.medicationScheduleId === schedule.id &&
                log.medicationScheduleTimeId === time.id &&
                log.scheduledAt.startsWith(dateText),
            );

            const localLog = localIntakeLogMap[statusKey];

            return {
              id: time.id,
              source: 'SERVER' as const,
              medicationScheduleId: schedule.id,
              medicationScheduleTimeId: time.id,
              scheduledAt: buildScheduledAt(dateText, time.takeTime),
              intakeLogId: localLog?.intakeLogId ?? matchedLog?.id,
              drugName:
                schedule.customMedicineName ||
                `등록 약 #${schedule.medicineId ?? schedule.id}`,
              dosage: getDosageLabel(schedule.dosageAmount, schedule.dosageUnit),
              time: time.takeTime,
              timing: getTimingLabel(time.timing),
              status: localLog?.status ?? matchedLog?.status ?? 'PENDING',
            };
          });
        });
    },
    [
      medicationSchedules,
      medicationScheduleTimes,
      medicationIntakeLogs,
      localIntakeLogMap,
    ],
  );

  const serverSelectedDateMedications = useMemo<TodayMedication[]>(() => {
    return getServerMedicationsByDate(selectedDate);
  }, [getServerMedicationsByDate, selectedDate]);

  const selectedDateMedications =
    serverSelectedDateMedications.length > 0
      ? serverSelectedDateMedications
      : medicationsByDate[selectedDate] ?? [];

  const selectedMedicationGroups = useMemo(() => {
    const groupMap = new Map<string, TodayMedication[]>();

    selectedDateMedications.forEach((medication) => {
      const current = groupMap.get(medication.time) ?? [];
      groupMap.set(medication.time, [...current, medication]);
    });

    return Array.from(groupMap.entries())
      .map(([time, items]) => ({
        time,
        items,
      }))
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [selectedDateMedications]);

  const handleChangeGroupStatus = (
    medications: TodayMedication[],
    status: MedicationStatus,
  ) => {
    const isAllSameStatus = medications.every(
      (medication) => medication.status === status,
    );

    medications.forEach((medication) => {
      if (isAllSameStatus || medication.status !== status) {
        handleChangeStatus(medication, status);
      }
    });
  };

  const weeklyStats = useMemo(() => {
    return getWeekDates(selectedDate).map((weekDate) => {
      const medications = getServerMedicationsByDate(weekDate.date);

      const rate =
        medications.length === 0
          ? 0
          : Math.round(
              (medications.filter((item) => item.status === 'TAKEN').length /
                medications.length) *
                100,
            );

      return {
        day: weekDate.day,
        date: weekDate.date,
        rate,
      };
    });
  }, [getServerMedicationsByDate, selectedDate]);

  const recentIntakeItems = useMemo(() => {
    return medicationIntakeLogs
      .slice()
      .sort((a, b) => {
        const aTime = new Date(a.takenAt ?? a.scheduledAt).getTime();
        const bTime = new Date(b.takenAt ?? b.scheduledAt).getTime();

        return bTime - aTime;
      })
      .slice(0, 5)
      .map((log) => {
        const schedule = medicationSchedules.find(
          (item) => item.id === log.medicationScheduleId,
        );

        const drugName =
          schedule?.customMedicineName ||
          `등록 약 #${schedule?.medicineId ?? log.medicationScheduleId}`;

        const displayDate = log.scheduledAt.startsWith(todayText)
          ? '오늘'
          : log.scheduledAt.slice(5, 10);

        const displayTime = (log.takenAt ?? log.scheduledAt).slice(11, 16);

        return {
          id: log.id,
          drugName,
          description: `${displayDate} ${displayTime} ${getIntakeStatusLabel(
            log.status,
          )}`,
        };
      });
  }, [medicationIntakeLogs, medicationSchedules, todayText]);

  const monthDays = useMemo(
    () => getMonthDays(calendarBaseDate),
    [calendarBaseDate],
  );

  const selectedTakenCount = selectedDateMedications.filter(
    (medication) => medication.status === 'TAKEN',
  ).length;

  const selectedCompletionRate =
    selectedDateMedications.length === 0
      ? 0
      : Math.round((selectedTakenCount / selectedDateMedications.length) * 100);

  const selectedRemainingCount = selectedDateMedications.filter(
    (medication) => medication.status !== 'TAKEN',
  ).length;

  const handleChangeMonth = (monthOffset: number) => {
    setCalendarBaseDate((prev) => {
      const nextDate = new Date(
        prev.getFullYear(),
        prev.getMonth() + monthOffset,
        1,
      );

      setSelectedDate(formatDate(nextDate));

      return nextDate;
    });
  };

  const handleMoveToday = () => {
    const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    setCalendarBaseDate(currentMonth);
    setSelectedDate(todayText);
  };

  const handleChangeStatus = (
    medication: TodayMedication,
    status: MedicationStatus,
  ) => {
    if (medication.status === status) {
      handleCancelIntakeLog(medication);
      return;
    }

    if (
      medication.source === 'SERVER' &&
      medication.intakeLogId &&
      medication.medicationScheduleId &&
      medication.medicationScheduleTimeId &&
      medication.scheduledAt
    ) {
      updateIntakeLogMutation.mutate(
        {
          id: medication.intakeLogId,
          body: {
            medicationScheduleId: medication.medicationScheduleId,
            medicationScheduleTimeId: medication.medicationScheduleTimeId,
            status: status === 'PENDING' ? 'MISSED' : status,
            scheduledAt: medication.scheduledAt,
            takenAt: status === 'TAKEN' ? formatDateTimeLocal(new Date()) : null,
          },
        },
        {
          onSuccess: (data) => {
            const statusKey = getIntakeStatusKey(
              medication.medicationScheduleId as number,
              medication.medicationScheduleTimeId as number,
              selectedDate,
            );

            setLocalIntakeLogMap((prev) => ({
              ...prev,
              [statusKey]: {
                status,
                intakeLogId: data.id,
              },
            }));

            toast.success(
              status === 'TAKEN'
                ? '복용 완료로 변경되었습니다.'
                : '건너뜀으로 변경되었습니다.',
            );
          },
          onError: (error) => {
            console.error('복용 기록 수정 실패:', error);
            toast.error('복용 기록 수정에 실패했습니다.');
          },
        },
      );

      return;
    }

    if (
      medication.source === 'SERVER' &&
      medication.medicationScheduleId &&
      medication.medicationScheduleTimeId &&
      medication.scheduledAt
    ) {
      createIntakeLogMutation.mutate(
        {
          medicationScheduleId: medication.medicationScheduleId,
          medicationScheduleTimeId: medication.medicationScheduleTimeId,
          status: status === 'PENDING' ? 'MISSED' : status,
          scheduledAt: medication.scheduledAt,
          takenAt: status === 'TAKEN' ? formatDateTimeLocal(new Date()) : null,
        },
        {
          onSuccess: (data) => {
            const statusKey = getIntakeStatusKey(
              medication.medicationScheduleId as number,
              medication.medicationScheduleTimeId as number,
              selectedDate,
            );

            setLocalIntakeLogMap((prev) => ({
              ...prev,
              [statusKey]: {
                status,
                intakeLogId: data.id,
              },
            }));

            toast.success(
              status === 'TAKEN'
                ? '복용 완료로 기록되었습니다.'
                : '건너뜀으로 기록되었습니다.',
            );
          },
          onError: (error) => {
            console.error('복용 기록 등록 실패:', error);
            toast.error('복용 기록 등록에 실패했습니다.');
          },
        },
      );

      return;
    }

    setMedicationsByDate((prev) => ({
      ...prev,
      [selectedDate]: (prev[selectedDate] ?? []).map((item) =>
        item.id === medication.id ? { ...item, status } : item,
      ),
    }));
  };

  const handleCancelIntakeLog = (medication: TodayMedication) => {
    if (
      medication.source === 'SERVER' &&
      medication.intakeLogId &&
      medication.medicationScheduleId &&
      medication.medicationScheduleTimeId
    ) {
      deleteIntakeLogMutation.mutate(medication.intakeLogId, {
        onSuccess: () => {
          const statusKey = getIntakeStatusKey(
            medication.medicationScheduleId as number,
            medication.medicationScheduleTimeId as number,
            selectedDate,
          );

          setLocalIntakeLogMap((prev) => {
            const next = { ...prev };
            delete next[statusKey];
            return next;
          });

          toast.success('복용 기록이 취소되었습니다.');
        },
        onError: (error) => {
          console.error('복용 기록 삭제 실패:', error);
          toast.error('복용 기록 삭제에 실패했습니다.');
        },
      });

      return;
    }

    setMedicationsByDate((prev) => ({
      ...prev,
      [selectedDate]: (prev[selectedDate] ?? []).map((item) =>
        item.id === medication.id ? { ...item, status: 'PENDING' } : item,
      ),
    }));
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-blue-600">
          Medication Schedule
        </p>

        <h1 className="mt-2 text-3xl font-bold text-slate-900">복약 일정</h1>

        <p className="mt-2 text-slate-500">
          오늘 복용해야 할 약과 주간 복약 현황을 확인합니다.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-sm text-slate-500">선택 날짜 복약 완료율</p>
          <p className="mt-3 text-3xl font-bold text-blue-600">
            {selectedCompletionRate}%
          </p>
          <p className="mt-2 text-sm text-slate-500">
            {selectedDateMedications.length}개 중 {selectedTakenCount}개 복용
            완료
          </p>
        </Card>

        <Card>
          <p className="text-sm text-slate-500">선택 날짜 남은 복약</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">
            {selectedRemainingCount}개
          </p>
          <p className="mt-2 text-sm text-slate-500">
            예정 상태의 약을 확인해주세요.
          </p>
        </Card>

        <Card>
          <p className="text-sm text-slate-500">등록된 복약 일정</p>
          <p className="mt-3 text-3xl font-bold text-amber-600">
            {activeMedicationScheduleCount}개
          </p>
          <p className="mt-2 text-sm text-slate-500">
            서버에 등록된 활성 복약 일정 기준입니다.
          </p>
        </Card>
      </div>

      {isMedicationScheduleLoading && (
        <Card>
          <p className="text-sm text-blue-700">
            서버에서 복약 일정을 불러오는 중입니다.
          </p>
        </Card>
      )}

      {isMedicationScheduleError && (
        <Card>
          <p className="text-sm text-red-700">
            복약 일정을 불러오지 못했습니다. 로그인 상태와 8081 서버를 확인해주세요.
          </p>
        </Card>
      )}

      {isMedicationScheduleTimeLoading && (
        <Card>
          <p className="text-sm text-blue-700">
            복약 시간 정보를 불러오는 중입니다.
          </p>
        </Card>
      )}

      {isMedicationScheduleTimeError && (
        <Card>
          <p className="text-sm text-red-700">
            복약 시간 정보를 불러오지 못했습니다.
          </p>
        </Card>
      )}

      {isMedicationIntakeLogLoading && (
        <Card>
          <p className="text-sm text-blue-700">
            복용 기록을 불러오는 중입니다.
          </p>
        </Card>
      )}

      {isMedicationIntakeLogError && (
        <Card>
          <p className="text-sm text-red-700">
            복용 기록을 불러오지 못했습니다.
          </p>
        </Card>
      )}

      {!isMedicationScheduleLoading &&
        !isMedicationScheduleError &&
        medicationSchedules.length > 0 && (
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  서버 복약 일정
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  현재 로그인 사용자 기준으로 조회된 복약 일정입니다.
                </p>
              </div>

              <Badge variant="blue">{medicationSchedules.length}건</Badge>
            </div>

            <div className="space-y-3">
              {medicationSchedules.slice(0, 5).map((schedule) => (
                <div
                  key={schedule.id}
                  className="rounded-2xl border border-slate-200 p-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold text-slate-900">
                      {schedule.customMedicineName ||
                        `등록 약 #${schedule.medicineId ?? '-'}`}
                    </p>

                    <Badge variant={schedule.isActive ? 'green' : 'gray'}>
                      {schedule.isActive ? '복용 중' : '비활성'}
                    </Badge>
                  </div>

                  <p className="mt-2 text-sm text-slate-500">
                    {schedule.startDate || '시작일 없음'} ~{' '}
                    {schedule.endDate || '종료일 없음'}
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    1회 {schedule.dosageAmount ?? '-'}
                    {schedule.dosageUnit ?? ''} · 하루{' '}
                    {schedule.timesPerDay ?? '-'}회 · 총{' '}
                    {schedule.durationDays ?? '-'}일
                  </p>
                </div>
              ))}
            </div>
          </Card>
        )}

      <Card>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {calendarBaseDate.getFullYear()}년{' '}
              {calendarBaseDate.getMonth() + 1}월 복약 달력
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              날짜를 클릭하면 아래 복약 목록이 선택한 날짜 기준으로 표시됩니다.
            </p>
          </div>

          <div className="flex flex-col items-start gap-3 md:items-end">
            <div className="flex flex-wrap justify-start gap-2 text-xs md:justify-end">
              <span className="rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-700">
                80% 이상
              </span>
              <span className="rounded-full bg-yellow-50 px-3 py-1 font-semibold text-yellow-700">
                50% 이상
              </span>
              <span className="rounded-full bg-red-50 px-3 py-1 font-semibold text-red-700">
                50% 미만
              </span>
              <span className="rounded-full bg-slate-50 px-3 py-1 font-semibold text-slate-500">
                일정 없음
              </span>
            </div>

            <div className="flex flex-wrap justify-start gap-2 md:justify-end">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="border border-slate-200"
                onClick={() => handleChangeMonth(-1)}
              >
                이전 달
              </Button>

              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="border border-slate-200"
                onClick={handleMoveToday}
              >
                오늘
              </Button>

              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="border border-slate-200"
                onClick={() => handleChangeMonth(1)}
              >
                다음 달
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-7 gap-2 text-center">
          {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
            <div key={day} className="py-2 text-sm font-bold text-slate-500">
              {day}
            </div>
          ))}

          {monthDays.map((day) => {
            if (!day.date) {
              return <div key={day.key} />;
            }

            const serverDayMedications = getServerMedicationsByDate(day.date);

            const dayMedications =
              serverDayMedications.length > 0
                ? serverDayMedications
                : medicationsByDate[day.date] ?? [];
                
            const rate =
              dayMedications.length === 0
                ? null
                : Math.round(
                    (dayMedications.filter((item) => item.status === 'TAKEN')
                      .length /
                      dayMedications.length) *
                      100,
                  );
            const isSelected = selectedDate === day.date;
            const isToday = todayText === day.date;

            return (
              <button
                key={day.key}
                type="button"
                onClick={() => setSelectedDate(day.date)}
                className={[
                  'min-h-16 rounded-2xl p-2 text-left transition hover:scale-[1.02]',
                  getCalendarDayClass(rate),
                  isSelected ? 'ring-2 ring-blue-500' : '',
                ].join(' ')}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold">{day.day}</span>

                  {isToday && (
                    <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white">
                      오늘
                    </span>
                  )}
                </div>

                {rate !== null && (
                  <p className="mt-2 text-xs font-semibold">{rate}%</p>
                )}
              </button>
            );
          })}
        </div>
      </Card>

      <Card>
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">선택 날짜 복약</h2>

            <p className="mt-1 text-sm text-slate-500">
              {selectedDate} 기준 복약 목록입니다.
            </p>
          </div>

          <Badge variant="blue">오늘</Badge>
        </div>

        <div className="space-y-4">
          {selectedDateMedications.length === 0 ? (
            <div className="rounded-2xl bg-slate-50 p-6 text-center text-sm text-slate-500">
              선택한 날짜에 등록된 복약 일정이 없습니다.
            </div>
          ) : (
            selectedMedicationGroups.map((group) => (
              <div
                key={group.time}
                className="rounded-2xl border border-slate-200 bg-white p-4"
              >
                <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-blue-600">
                      {group.time}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      같은 시간대 복약 {group.items.length}개
                    </p>
                  </div>

                  {group.items.length > 1 && (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="primary"
                        onClick={() => handleChangeGroupStatus(group.items, 'TAKEN')}
                        disabled={
                          createIntakeLogMutation.isPending ||
                          updateIntakeLogMutation.isPending ||
                          deleteIntakeLogMutation.isPending
                        }
                      >
                        이 시간 전체 복용 완료
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="border border-slate-200"
                        onClick={() => handleChangeGroupStatus(group.items, 'SKIPPED')}
                        disabled={
                          createIntakeLogMutation.isPending ||
                          updateIntakeLogMutation.isPending ||
                          deleteIntakeLogMutation.isPending
                        }
                      >
                        이 시간 전체 건너뜀
                      </Button>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  {group.items.map((medication) => (
                    <div
                      key={`${medication.medicationScheduleId ?? 'mock'}-${
                        medication.id
                      }`}
                      className="flex flex-col gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 md:flex-row md:items-center md:justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleMoveDrugSearch(medication.drugName)}
                            className="font-bold text-slate-900 hover:text-blue-700 hover:underline"
                          >
                            {medication.drugName}
                          </button>

                          {getStatusBadge(medication.status)}
                        </div>

                        <p className="mt-2 text-sm text-slate-500">
                          {medication.time} · {medication.dosage} · {medication.timing}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant={medication.status === 'TAKEN' ? 'primary' : 'ghost'}
                          className={
                            medication.status === 'TAKEN'
                              ? 'ring-2 ring-blue-200'
                              : 'border border-slate-200'
                          }
                          onClick={() => handleChangeStatus(medication, 'TAKEN')}
                          disabled={
                            createIntakeLogMutation.isPending ||
                            updateIntakeLogMutation.isPending ||
                            deleteIntakeLogMutation.isPending
                          }
                        >
                          복용 완료
                        </Button>

                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className={[
                            'border',
                            medication.status === 'SKIPPED'
                              ? 'border-yellow-300 bg-yellow-100 font-bold text-yellow-700 ring-2 ring-yellow-200'
                              : 'border-slate-200',
                          ].join(' ')}
                          onClick={() => handleChangeStatus(medication, 'SKIPPED')}
                          disabled={
                            createIntakeLogMutation.isPending ||
                            updateIntakeLogMutation.isPending ||
                            deleteIntakeLogMutation.isPending
                          }
                        >
                          건너뜀
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="text-xl font-bold text-slate-900">주간 복약 현황</h2>

          <div className="mt-6 space-y-4">
            {weeklyStats.map((stat) => (
              <div key={stat.day}>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700">
                    {stat.day}
                    <span className="ml-2 text-xs text-slate-400">
                      {stat.date.slice(5)}
                    </span>
                  </span>
                  <span className="text-slate-500">{stat.rate}%</span>
                </div>

                <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-blue-600"
                    style={{ width: `${stat.rate}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-bold text-slate-900">최근 복용 기록</h2>

          <div className="mt-6 space-y-4">
            {recentIntakeItems.length === 0 ? (
              <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                최근 복용 기록이 없습니다.
              </div>
            ) : (
              recentIntakeItems.map((item) => (
                <div key={item.id} className="rounded-xl bg-slate-50 p-4">
                  <p className="font-semibold text-slate-900">{item.drugName}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {item.description}
                  </p>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

export default SchedulePage;
