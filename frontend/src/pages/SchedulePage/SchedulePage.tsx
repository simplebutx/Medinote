import { useCallback, useEffect, useMemo, useState } from 'react';
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

import type {
  MedicationSchedule,
  MedicationScheduleTime,
} from '../../features/schedule/types/schedule.types';

type MedicationStatus = 'PENDING' | 'TAKEN' | 'SKIPPED' | 'MISSED';

interface TodayMedication {
  id: number;
  drugName: string;
  dosage: string;
  time: string;
  timing: string;
  status: MedicationStatus;
  source?: 'SERVER';
  medicationScheduleId?: number;
  medicationScheduleMedicineId?: number;
  medicationScheduleTimeId?: number;
  scheduledAt?: string;
  intakeLogId?: number;
}

function isMedicationExpired(
  medication: TodayMedication,
  currentTimestamp: number,
) {
  if (medication.status !== 'PENDING' || !medication.scheduledAt) {
    return false;
  }

  const scheduledTimestamp = new Date(medication.scheduledAt).getTime();

  return (
    Number.isFinite(scheduledTimestamp) &&
    scheduledTimestamp < currentTimestamp
  );
}

function getStatusBadge(
  medication: TodayMedication,
  currentTimestamp: number,
) {
  if (medication.status === 'TAKEN') {
    return <Badge variant="green">복용 완료</Badge>;
  }

  if (medication.status === 'SKIPPED') {
    return <Badge variant="yellow">건너뜀</Badge>;
  }

  if (medication.status === 'MISSED') {
    return <Badge variant="red">누락</Badge>;
  }

  if (isMedicationExpired(medication, currentTimestamp)) {
    return <Badge variant="gray">만료</Badge>;
  }

  return <Badge variant="yellow">예정</Badge>;
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

function formatMedicationDateTitle(dateText: string) {
  const [, month, day] = dateText.split('-').map(Number);

  return `${month}월 ${day}일 복약`;
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

function getTakeTimeLabel(time: string) {
  return time.slice(0, 5);
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
    return 'border border-slate-200 bg-white text-slate-400';
  }

  if (rate >= 80) {
    return 'border border-emerald-200 bg-emerald-50/80 text-emerald-700';
  }

  if (rate >= 50) {
    return 'border border-amber-200 bg-amber-50/80 text-amber-700';
  }

  return 'border border-red-200 bg-red-50/80 text-red-700';
}

function getScheduleMedicines(schedule?: MedicationSchedule | null) {
  return schedule?.medicines ?? schedule?.medicationScheduleMedicines ?? [];
}

function getPrimaryMedicine(schedule?: MedicationSchedule | null) {
  return getScheduleMedicines(schedule)[0] ?? null;
}

function getScheduleDisplayName(schedule?: MedicationSchedule | null) {
  const primaryMedicine = getPrimaryMedicine(schedule);

  return (
    primaryMedicine?.customMedicineName ||
    `등록 약 #${primaryMedicine?.medicineId ?? schedule?.id ?? '-'}`
  );
}

function getScheduleRange(schedule?: MedicationSchedule | null) {
  const medicines = getScheduleMedicines(schedule);

  if (medicines.length === 0) {
    return {
      startDate: schedule?.startDate ?? null,
      endDate: schedule?.endDate ?? null,
      durationDays: schedule?.durationDays ?? null,
    };
  }

  const startDates = medicines
    .map((medicine) => medicine.startDate)
    .filter((value): value is string => Boolean(value))
    .sort();
  const endDates = medicines
    .map((medicine) => medicine.endDate)
    .filter((value): value is string => Boolean(value))
    .sort();
  const durationDays = medicines.reduce<number | null>((maxValue, medicine) => {
    if (medicine.durationDays == null) {
      return maxValue;
    }

    if (maxValue == null) {
      return medicine.durationDays;
    }

    return Math.max(maxValue, medicine.durationDays);
  }, null);

  return {
    startDate: startDates[0] ?? schedule?.startDate ?? null,
    endDate: endDates[endDates.length - 1] ?? schedule?.endDate ?? null,
    durationDays: durationDays ?? schedule?.durationDays ?? null,
  };
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
  const [currentTimestamp, setCurrentTimestamp] = useState(today.getTime());

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setCurrentTimestamp(Date.now());
    }, 60_000);

    return () => window.clearInterval(timerId);
  }, []);

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
            // schedule.isActive &&
            isDateInScheduleRange(
              dateText,
              getScheduleRange(schedule).startDate,
              getScheduleRange(schedule).endDate,
            ),
        )
        .flatMap((schedule) => {
          const scheduleMedicines = getScheduleMedicines(schedule);

          if (scheduleMedicines.length === 0) {
            const times = medicationScheduleTimes.filter(
              (time: MedicationScheduleTime) =>
                time.medicationScheduleId === schedule.id,
            );

            return times.map((time) => {
              const statusKey = getIntakeStatusKey(
                schedule.id,
                time.id,
                dateText,
              );

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
                drugName: getScheduleDisplayName(schedule),
                dosage: getDosageLabel(),
                time: getTakeTimeLabel(time.takeTime),
                timing: getTimingLabel(time.timing),
                status: localLog?.status ?? matchedLog?.status ?? 'PENDING',
              };
            });
          }

          return scheduleMedicines
            .filter(
              (medicine) =>
                // medicine.isActive !== false &&
                isDateInScheduleRange(
                  dateText,
                  medicine.startDate ?? getScheduleRange(schedule).startDate,
                  medicine.endDate ?? getScheduleRange(schedule).endDate,
                ),
            )
            .flatMap((medicine) => {
              const times = medicationScheduleTimes.filter(
                (time: MedicationScheduleTime) =>
                  time.medicationScheduleMedicineId === medicine.id,
              );

              return times.map((time) => {
                const statusKey = getIntakeStatusKey(
                  schedule.id,
                  time.id,
                  dateText,
                );

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
                  medicationScheduleMedicineId: medicine.id,
                  medicationScheduleTimeId: time.id,
                  scheduledAt: buildScheduledAt(dateText, time.takeTime),
                  intakeLogId: localLog?.intakeLogId ?? matchedLog?.id,
                  drugName:
                    medicine.customMedicineName ||
                    `등록 약 #${medicine.medicineId ?? medicine.id}`,
                  dosage: getDosageLabel(
                    medicine.dosageAmount,
                    medicine.dosageUnit,
                  ),
                  time: getTakeTimeLabel(time.takeTime),
                  timing: getTimingLabel(time.timing),
                  status: localLog?.status ?? matchedLog?.status ?? 'PENDING',
                };
              });
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

  const selectedDateMedications = serverSelectedDateMedications;

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

        const scheduleTime = medicationScheduleTimes.find(
          (time: MedicationScheduleTime) =>
            time.id === log.medicationScheduleTimeId,
        );

        const scheduleMedicines =
          schedule?.medicines ?? schedule?.medicationScheduleMedicines ?? [];

        const medicine = scheduleMedicines.find(
          (item) => item.id === scheduleTime?.medicationScheduleMedicineId,
        );

        const drugName =
          medicine?.customMedicineName ||
          getScheduleDisplayName(schedule) ||
          `등록 약 #${medicine?.medicineId ?? log.medicationScheduleId}`;

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
  }, [
    medicationIntakeLogs,
    medicationSchedules,
    medicationScheduleTimes,
    todayText,
  ]);

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

  const selectedPendingMedications = selectedDateMedications.filter(
    (medication) => medication.status === 'PENDING',
  ).length;

  const selectedExpiredCount = selectedDateMedications.filter((medication) =>
    isMedicationExpired(medication, currentTimestamp),
  ).length;

  const selectedScheduledCount =
    selectedPendingMedications - selectedExpiredCount;

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
            takenAt:
              status === 'TAKEN' ? formatDateTimeLocal(new Date()) : null,
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

    toast.error('복용 기록을 변경할 일정 정보를 찾지 못했습니다.');
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

    toast.error('취소할 복용 기록 정보를 찾지 못했습니다.');
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-sm font-semibold text-slate-500">
            선택 날짜 복약 완료율
          </p>
          <p className="mt-3 text-3xl font-extrabold text-blue-600">
            {selectedCompletionRate}%
          </p>
          <p className="mt-2 text-sm text-slate-500">
            {selectedDateMedications.length}개 중 {selectedTakenCount}개 복용
            완료
          </p>
        </Card>

        <Card>
          <p className="text-sm font-semibold text-slate-500">
            선택 날짜 남은 복약
          </p>
          <p className="mt-3 text-3xl font-extrabold text-slate-950">
            {selectedPendingMedications}개
          </p>
          <p className="mt-2 text-sm text-slate-500">
            예정 {selectedScheduledCount}개 · 만료 {selectedExpiredCount}개
          </p>
        </Card>

        <Card>
          <p className="text-sm font-semibold text-slate-500">
            등록된 복약 일정
          </p>
          <p className="mt-3 text-3xl font-extrabold text-amber-600">
            {activeMedicationScheduleCount}개
          </p>
          <p className="mt-2 text-sm text-slate-500">
            서버에 등록된 활성 복약 일정 기준입니다.
          </p>
        </Card>
      </div>

      {isMedicationScheduleLoading && (
        <Card className="border-blue-100 bg-blue-50/70">
          <p className="text-sm text-blue-700">
            서버에서 복약 일정을 불러오는 중입니다.
          </p>
        </Card>
      )}

      {isMedicationScheduleError && (
        <Card className="border-red-100 bg-red-50/70">
          <p className="text-sm text-red-700">
            복약 일정을 불러오지 못했습니다. 로그인 상태와 8081 서버를
            확인해주세요.
          </p>
        </Card>
      )}

      {isMedicationScheduleTimeLoading && (
        <Card className="border-blue-100 bg-blue-50/70">
          <p className="text-sm text-blue-700">
            복약 시간 정보를 불러오는 중입니다.
          </p>
        </Card>
      )}

      {isMedicationScheduleTimeError && (
        <Card className="border-red-100 bg-red-50/70">
          <p className="text-sm text-red-700">
            복약 시간 정보를 불러오지 못했습니다.
          </p>
        </Card>
      )}

      {isMedicationIntakeLogLoading && (
        <Card className="border-blue-100 bg-blue-50/70">
          <p className="text-sm text-blue-700">
            복용 기록을 불러오는 중입니다.
          </p>
        </Card>
      )}

      {isMedicationIntakeLogError && (
        <Card className="border-red-100 bg-red-50/70">
          <p className="text-sm text-red-700">
            복용 기록을 불러오지 못했습니다.
          </p>
        </Card>
      )}

      <Card>
        <div className="lg:grid lg:grid-cols-[1fr_360px] lg:items-start lg:gap-x-6">
          <div>
          <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {calendarBaseDate.getFullYear()}년{' '}
              {calendarBaseDate.getMonth() + 1}월 복약 달력
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              날짜를 클릭하면 아래 목록이 해당 날짜 기준으로 표시됩니다.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => handleChangeMonth(-1)}
            >
              이전 달
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={handleMoveToday}
            >
              오늘
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => handleChangeMonth(1)}
            >
              다음 달
            </Button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700">
            80% 이상
          </span>
          <span className="rounded-full border border-amber-100 bg-amber-50 px-2.5 py-1 font-semibold text-amber-700">
            50% 이상
          </span>
          <span className="rounded-full border border-red-100 bg-red-50 px-2.5 py-1 font-semibold text-red-700">
            50% 미만
          </span>
          <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 font-semibold text-slate-500">
            일정 없음
          </span>
        </div>

        <div className="mt-5 grid grid-cols-7 gap-1.5 text-center">
          {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
            <div key={day} className="py-2 text-sm font-bold text-slate-500">
              {day}
            </div>
          ))}

          {monthDays.map((day) => {
            if (!day.date) {
              return <div key={day.key} />;
            }

            const dayMedications = getServerMedicationsByDate(day.date);

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
                  'min-h-14 rounded-xl p-2 text-left transition hover:border-blue-300 hover:bg-blue-50/60',
                  getCalendarDayClass(rate),
                  isSelected ? 'ring-2 ring-blue-500 ring-offset-1' : '',
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
          </div>

          <div className="mt-6 border-t border-slate-200 pt-6 lg:mt-0 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">
              {formatMedicationDateTitle(selectedDate)}
            </h2>

            <Badge variant="blue">
              {selectedDate === todayText ? '오늘' : '선택일'}
            </Badge>
          </div>

          <div className="space-y-3 lg:max-h-[520px] lg:overflow-y-auto lg:pr-1">
          {selectedDateMedications.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-6 text-center text-sm text-slate-500">
              선택한 날짜에 등록된 복약 일정이 없습니다.
            </div>
          ) : (
            selectedMedicationGroups.map((group) => (
              <div
                key={group.time}
                className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
              >
                <div className="mb-3 flex flex-col gap-2">
                  <div>
                    <p className="text-sm font-semibold text-blue-600">
                      {group.time}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      같은 시간대 복약 {group.items.length}개
                    </p>
                  </div>

                  {group.items.length > 1 && (
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="primary"
                        className="w-full"
                        onClick={() =>
                          handleChangeGroupStatus(group.items, 'TAKEN')
                        }
                        disabled={
                          createIntakeLogMutation.isPending ||
                          updateIntakeLogMutation.isPending ||
                          deleteIntakeLogMutation.isPending
                        }
                      >
                        전체 복용 완료
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="w-full border border-slate-200"
                        onClick={() =>
                          handleChangeGroupStatus(group.items, 'SKIPPED')
                        }
                        disabled={
                          createIntakeLogMutation.isPending ||
                          updateIntakeLogMutation.isPending ||
                          deleteIntakeLogMutation.isPending
                        }
                      >
                        전체 건너뜀
                      </Button>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  {group.items.map((medication) => (
                    <div
                      key={`${medication.medicationScheduleId}-${medication.id}`}
                      className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3"
                    >
                      <div>
                        <div className="flex items-start gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              handleMoveDrugSearch(medication.drugName)
                            }
                            className="min-w-0 flex-1 text-left text-sm font-bold text-slate-900 hover:text-blue-700 hover:underline"
                          >
                            {medication.drugName}
                          </button>

                          <span className="mt-0.5 shrink-0">
                            {getStatusBadge(medication, currentTimestamp)}
                          </span>
                        </div>

                        <p className="mt-1 text-xs text-slate-500">
                          {medication.time} · {medication.dosage} ·{' '}
                          {medication.timing}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant={
                            medication.status === 'TAKEN' ? 'primary' : 'ghost'
                          }
                          className={
                            medication.status === 'TAKEN'
                              ? 'w-full ring-2 ring-blue-200'
                              : 'w-full border border-slate-200'
                          }
                          onClick={() =>
                            handleChangeStatus(medication, 'TAKEN')
                          }
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
                            'w-full border',
                            medication.status === 'SKIPPED'
                              ? 'border-amber-300 bg-amber-50 font-bold text-amber-700 ring-2 ring-amber-100'
                              : 'border-slate-200',
                          ].join(' ')}
                          onClick={() =>
                            handleChangeStatus(medication, 'SKIPPED')
                          }
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
          </div>
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

                <div className="h-3 overflow-hidden rounded-full border border-slate-100 bg-slate-100">
                  <div
                    className="h-full rounded-full bg-blue-600 shadow-sm shadow-blue-600/20"
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
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-500">
                최근 복용 기록이 없습니다.
              </div>
            ) : (
              recentIntakeItems.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-slate-200 bg-slate-50/70 p-4"
                >
                  <p className="font-semibold text-slate-900">
                    {item.drugName}
                  </p>
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
