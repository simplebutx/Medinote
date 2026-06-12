import { Badge, Button, Card } from '../../components/ui';

const pillboxSlots = [
  {
    id: 1,
    label: '1번 칸',
    medicineName: '아침 복약',
    status: '복용 완료',
    statusVariant: 'green' as const,
    time: '08:00',
    description: '오늘 아침 복약이 완료되었습니다.',
  },
  {
    id: 2,
    label: '2번 칸',
    medicineName: '점심 복약',
    status: '대기 중',
    statusVariant: 'blue' as const,
    time: '13:00',
    description: '복약 시간이 되면 알림을 보냅니다.',
  },
  {
    id: 3,
    label: '3번 칸',
    medicineName: '저녁 복약',
    status: '예정',
    statusVariant: 'gray' as const,
    time: '19:00',
    description: '저녁 복약 일정이 등록되어 있습니다.',
  },
  {
    id: 4,
    label: '4번 칸',
    medicineName: '비어 있음',
    status: '미사용',
    statusVariant: 'gray' as const,
    time: '-',
    description: '스마트 약통 칸을 추가로 설정할 수 있습니다.',
  },
];

const recentLogs = [
  {
    id: 1,
    time: '오늘 08:03',
    title: '1번 칸 복용 완료',
    description: '사용자가 약통을 열고 복약을 완료했습니다.',
  },
  {
    id: 2,
    time: '어제 19:12',
    title: '저녁 복약 지연',
    description: '예정 시간보다 12분 늦게 복약했습니다.',
  },
  {
    id: 3,
    time: '어제 13:00',
    title: '점심 복약 알림 발송',
    description: '스마트 약통 알림이 발송되었습니다.',
  },
];

function IotPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-blue-600">
            Smart Pillbox
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            스마트 약통
          </h1>

          <p className="mt-2 text-slate-500">
            스마트 약통과 연동해 복약 시간, 약통 개폐 여부, 복용 상태를
            확인하는 화면입니다.
          </p>
        </div>

        <Badge variant="gray">기기 연동 준비 중</Badge>
      </div>

      <Card className="border-blue-100 bg-blue-50">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="font-bold text-blue-900">
              현재는 화면 설계용 미리보기입니다.
            </p>

            <p className="mt-1 text-sm leading-6 text-blue-700">
              스마트 약통 API와 실제 기기 연동이 준비되면 이 화면에서 기기
              연결 상태, 칸별 약 정보, 복약 완료 여부를 실시간으로 확인할 수
              있습니다.
            </p>
          </div>

          <Button type="button" disabled>
            기기 연결 준비 중
          </Button>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <p className="text-sm font-semibold text-slate-500">기기 상태</p>

          <div className="mt-4 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                연결 대기
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                아직 등록된 스마트 약통이 없습니다.
              </p>
            </div>

            <Badge variant="gray">OFFLINE</Badge>
          </div>
        </Card>

        <Card>
          <p className="text-sm font-semibold text-slate-500">
            오늘 복약 현황
          </p>

          <div className="mt-4">
            <h2 className="text-2xl font-bold text-slate-900">1 / 3회</h2>

            <p className="mt-2 text-sm text-slate-500">
              오늘 예정된 복약 중 1회가 완료되었습니다.
            </p>
          </div>
        </Card>

        <Card>
          <p className="text-sm font-semibold text-slate-500">다음 알림</p>

          <div className="mt-4">
            <h2 className="text-2xl font-bold text-slate-900">13:00</h2>

            <p className="mt-2 text-sm text-slate-500">
              점심 복약 알림이 예정되어 있습니다.
            </p>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                약통 칸별 상태
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                각 칸에 등록된 약과 복약 상태를 확인합니다.
              </p>
            </div>

            <Badge variant="blue">4칸</Badge>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {pillboxSlots.map((slot) => (
              <div
                key={slot.id}
                className="rounded-2xl border border-slate-200 bg-white p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-blue-600">
                      {slot.label}
                    </p>

                    <h3 className="mt-2 font-bold text-slate-900">
                      {slot.medicineName}
                    </h3>
                  </div>

                  <Badge variant={slot.statusVariant}>{slot.status}</Badge>
                </div>

                <div className="mt-4 rounded-xl bg-slate-50 px-3 py-2">
                  <p className="text-sm font-semibold text-slate-700">
                    예정 시간: {slot.time}
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {slot.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-bold text-slate-900">연동 예정 기능</h2>

          <div className="mt-4 space-y-3">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="font-semibold text-slate-800">기기 등록</p>
              <p className="mt-1 text-sm text-slate-500">
                QR 코드 또는 기기 ID로 스마트 약통을 등록합니다.
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="font-semibold text-slate-800">실시간 상태 확인</p>
              <p className="mt-1 text-sm text-slate-500">
                약통 개폐 여부와 복약 완료 여부를 서버와 동기화합니다.
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="font-semibold text-slate-800">복약 알림 연동</p>
              <p className="mt-1 text-sm text-slate-500">
                복약 일정과 약통 알림을 연결해 미복용 상태를 확인합니다.
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              최근 약통 기록
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              실제 API 연동 전까지는 예시 데이터로 표시됩니다.
            </p>
          </div>

          <Badge variant="gray">Mock Data</Badge>
        </div>

        <div className="mt-5 space-y-3">
          {recentLogs.map((log) => (
            <div
              key={log.id}
              className="flex flex-col gap-2 rounded-2xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-semibold text-slate-900">{log.title}</p>

                <p className="mt-1 text-sm text-slate-500">
                  {log.description}
                </p>
              </div>

              <p className="text-sm font-semibold text-slate-400">
                {log.time}
              </p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export default IotPage;