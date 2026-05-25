import { useMemo, useState } from 'react';
import { Badge, Button, Card } from '../../components/ui';

type MedicationStatus = 'PENDING' | 'TAKEN' | 'SKIPPED' | 'MISSED';

interface TodayMedication {
  id: number;
  drugName: string;
  dosage: string;
  time: string;
  timing: string;
  status: MedicationStatus;
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

const weeklyStats = [
  { day: '월', rate: 100 },
  { day: '화', rate: 80 },
  { day: '수', rate: 100 },
  { day: '목', rate: 60 },
  { day: '금', rate: 75 },
  { day: '토', rate: 0 },
  { day: '일', rate: 0 },
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
  const todayText = formatDate(today);
  const [selectedDate, setSelectedDate] = useState(todayText);
  const [calendarBaseDate, setCalendarBaseDate] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );

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

  const selectedDateMedications = medicationsByDate[selectedDate] ?? [];

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
    medicationId: number,
    status: MedicationStatus,
  ) => {
    setMedicationsByDate((prev) => ({
      ...prev,
      [selectedDate]: (prev[selectedDate] ?? []).map((medication) =>
        medication.id === medicationId ? { ...medication, status } : medication,
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
          <p className="text-sm text-slate-500">주의 성분 알림</p>
          <p className="mt-3 text-3xl font-bold text-amber-600">1건</p>
          <p className="mt-2 text-sm text-slate-500">
            아스피린 복용 시 위장 부작용 이력 확인
          </p>
        </Card>
      </div>

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

            const dayMedications = medicationsByDate[day.date] ?? [];
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

        <div className="space-y-3">
          {selectedDateMedications.length === 0 ? (
            <div className="rounded-2xl bg-slate-50 p-6 text-center text-sm text-slate-500">
              선택한 날짜에 등록된 복약 일정이 없습니다.
            </div>
          ) : (
            selectedDateMedications.map((medication) => (
              <div
                key={medication.id}
                className="flex flex-col gap-4 rounded-2xl border border-slate-200 p-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-slate-900">
                      {medication.drugName}
                    </p>
                    {getStatusBadge(medication.status)}
                  </div>

                  <p className="mt-2 text-sm text-slate-500">
                    {medication.time} · {medication.dosage} ·{' '}
                    {medication.timing}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="primary"
                    onClick={() => handleChangeStatus(medication.id, 'TAKEN')}
                  >
                    복용 완료
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="border border-slate-200"
                    onClick={() => handleChangeStatus(medication.id, 'SKIPPED')}
                  >
                    건너뜀
                  </Button>
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
                  <span className="font-medium text-slate-700">{stat.day}</span>
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
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="font-semibold text-slate-900">아스피린 100mg</p>
              <p className="mt-1 text-sm text-slate-500">
                오늘 08:05 복용 완료
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="font-semibold text-slate-900">암로디핀 5mg</p>
              <p className="mt-1 text-sm text-slate-500">
                어제 13:02 복용 완료
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="font-semibold text-slate-900">타이레놀 500mg</p>
              <p className="mt-1 text-sm text-slate-500">어제 20:00 건너뜀</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default SchedulePage;
