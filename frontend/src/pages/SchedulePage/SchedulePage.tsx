import { useState } from "react";
import { Badge, Button, Card } from "../../components/ui";

type MedicationStatus = "PENDING" | "TAKEN" | "SKIPPED" | "MISSED";

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
    drugName: "아스피린 100mg",
    dosage: "1정",
    time: "08:00",
    timing: "식후",
    status: "TAKEN",
  },
  {
    id: 2,
    drugName: "암로디핀 5mg",
    dosage: "1정",
    time: "13:00",
    timing: "식후",
    status: "PENDING",
  },
  {
    id: 3,
    drugName: "타이레놀 500mg",
    dosage: "1정",
    time: "20:00",
    timing: "필요 시",
    status: "PENDING",
  },
];

const weeklyStats = [
  { day: "월", rate: 100 },
  { day: "화", rate: 80 },
  { day: "수", rate: 100 },
  { day: "목", rate: 60 },
  { day: "금", rate: 75 },
  { day: "토", rate: 0 },
  { day: "일", rate: 0 },
];

function getStatusBadge(status: MedicationStatus) {
  if (status === "TAKEN") {
    return <Badge variant="green">복용 완료</Badge>;
  }

  if (status === "SKIPPED") {
    return <Badge variant="yellow">건너뜀</Badge>;
  }

  if (status === "MISSED") {
    return <Badge variant="red">누락</Badge>;
  }

  return <Badge variant="gray">예정</Badge>;
}

function SchedulePage() {
  const [todayMedications, setTodayMedications] = useState(
    initialTodayMedications
  );

  const takenCount = todayMedications.filter(
    (medication) => medication.status === "TAKEN"
  ).length;

  const completionRate = Math.round(
    (takenCount / todayMedications.length) * 100
  );

  const handleChangeStatus = (
    medicationId: number,
    status: MedicationStatus
  ) => {
    setTodayMedications((prev) =>
      prev.map((medication) =>
        medication.id === medicationId
          ? { ...medication, status }
          : medication
      )
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-blue-600">
          Medication Schedule
        </p>

        <h1 className="mt-2 text-3xl font-bold text-slate-900">
          복약 일정
        </h1>

        <p className="mt-2 text-slate-500">
          오늘 복용해야 할 약과 주간 복약 현황을 확인합니다.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-sm text-slate-500">오늘 복약 완료율</p>
          <p className="mt-3 text-3xl font-bold text-blue-600">
            {completionRate}%
          </p>
          <p className="mt-2 text-sm text-slate-500">
            {todayMedications.length}개 중 {takenCount}개 복용 완료
          </p>
        </Card>

        <Card>
          <p className="text-sm text-slate-500">오늘 남은 복약</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">
            {todayMedications.length - takenCount}개
          </p>
          <p className="mt-2 text-sm text-slate-500">
            예정 상태의 약을 확인해주세요.
          </p>
        </Card>

        <Card>
          <p className="text-sm text-slate-500">주의 성분 알림</p>
          <p className="mt-3 text-3xl font-bold text-amber-600">
            1건
          </p>
          <p className="mt-2 text-sm text-slate-500">
            아스피린 복용 시 위장 부작용 이력 확인
          </p>
        </Card>
      </div>

      <Card>
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              오늘 복용
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              복용 후 상태를 체크하면 완료율이 갱신됩니다.
            </p>
          </div>

          <Badge variant="blue">오늘</Badge>
        </div>

        <div className="space-y-3">
          {todayMedications.map((medication) => (
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
                  {medication.time} · {medication.dosage} · {medication.timing}
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="primary"
                  onClick={() =>
                    handleChangeStatus(medication.id, "TAKEN")
                  }
                >
                  복용 완료
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="border border-slate-200"
                  onClick={() =>
                    handleChangeStatus(medication.id, "SKIPPED")
                  }
                >
                  건너뜀
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="text-xl font-bold text-slate-900">
            주간 복약 현황
          </h2>

          <div className="mt-6 space-y-4">
            {weeklyStats.map((stat) => (
              <div key={stat.day}>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700">
                    {stat.day}
                  </span>
                  <span className="text-slate-500">
                    {stat.rate}%
                  </span>
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
          <h2 className="text-xl font-bold text-slate-900">
            최근 복용 기록
          </h2>

          <div className="mt-6 space-y-4">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="font-semibold text-slate-900">
                아스피린 100mg
              </p>
              <p className="mt-1 text-sm text-slate-500">
                오늘 08:05 복용 완료
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="font-semibold text-slate-900">
                암로디핀 5mg
              </p>
              <p className="mt-1 text-sm text-slate-500">
                어제 13:02 복용 완료
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="font-semibold text-slate-900">
                타이레놀 500mg
              </p>
              <p className="mt-1 text-sm text-slate-500">
                어제 20:00 건너뜀
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default SchedulePage;