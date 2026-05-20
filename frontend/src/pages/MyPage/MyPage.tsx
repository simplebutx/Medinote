import { useState } from 'react';
import { Badge, Button, Card } from '../../components/ui';

type MyPageTab = 'profile' | 'caution' | 'history' | 'prescription';

const tabs: { label: string; value: MyPageTab }[] = [
  { label: '기본 정보', value: 'profile' },
  { label: '알레르기/주의 성분', value: 'caution' },
  { label: '복약 이력', value: 'history' },
  { label: '처방전', value: 'prescription' },
];

const cautionItems = [
  {
    id: 1,
    name: '페니실린',
    type: '알레르기',
    memo: '두드러기, 호흡 곤란 이력',
    badge: 'red' as const,
  },
  {
    id: 2,
    name: '아스피린',
    type: '부작용',
    memo: '복용 후 심한 속쓰림',
    badge: 'yellow' as const,
  },
  {
    id: 3,
    name: 'NSAIDs',
    type: '회피 성분',
    memo: '위장 장애 우려로 주의',
    badge: 'yellow' as const,
  },
];

const adherenceItems = [
  { drugName: '아스피린 100mg', rate: 92 },
  { drugName: '암로디핀 5mg', rate: 86 },
  { drugName: '타이레놀 500mg', rate: 74 },
];

const prescriptions = [
  {
    id: 1,
    title: '내과 처방전',
    date: '2026.05.12',
    status: '복용 중',
    medicines: ['아스피린 100mg', '암로디핀 5mg'],
  },
  {
    id: 2,
    title: '두통 관련 처방',
    date: '2026.05.03',
    status: '종료',
    medicines: ['타이레놀 500mg'],
  },
];

function MyPage() {
  const [activeTab, setActiveTab] = useState<MyPageTab>('profile');

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-blue-600">My Page</p>

        <h1 className="mt-2 text-3xl font-bold text-slate-900">내 정보</h1>

        <p className="mt-2 text-slate-500">
          기본 정보, 알레르기/주의 성분, 복약 이력, 처방전 정보를 관리합니다.
        </p>
      </div>

      <Card>
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-xl font-bold text-blue-700">
                오
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900">오충환</h2>
                <p className="text-sm text-slate-500">user@example.com</p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Badge variant="blue">일반 사용자</Badge>
              <Badge variant="green">활성 계정</Badge>
              <Badge variant="yellow">주의 성분 3건</Badge>
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            className="border border-slate-200"
          >
            프로필 수정
          </Button>
        </div>
      </Card>

      <Card className="p-0">
        <div className="flex overflow-x-auto border-b border-slate-200">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.value;

            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setActiveTab(tab.value)}
                className={[
                  'min-w-fit px-5 py-4 text-sm font-semibold transition',
                  isActive
                    ? 'border-b-2 border-blue-600 text-blue-700'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900',
                ].join(' ')}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="p-6">
          {activeTab === 'profile' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-slate-900">기본 정보</h2>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">이름</p>
                  <p className="mt-2 font-semibold text-slate-900">오충환</p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">이메일</p>
                  <p className="mt-2 font-semibold text-slate-900">
                    user@example.com
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">생년월일</p>
                  <p className="mt-2 font-semibold text-slate-900">
                    1998.05.12
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">성별</p>
                  <p className="mt-2 font-semibold text-slate-900">남성</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'caution' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    알레르기/주의 성분
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    OCR, 약 검색, 약사 상담에서 참고되는 정보입니다.
                  </p>
                </div>

                <Button type="button" size="sm">
                  추가
                </Button>
              </div>

              <div className="space-y-3">
                {cautionItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-slate-900">{item.name}</p>
                        <Badge variant={item.badge}>{item.type}</Badge>
                      </div>

                      <p className="mt-2 text-sm text-slate-500">{item.memo}</p>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="border border-slate-200"
                      >
                        수정
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="border border-slate-200"
                      >
                        삭제
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-5">
              <h2 className="text-xl font-bold text-slate-900">복약 이력</h2>

              {adherenceItems.map((item) => (
                <div key={item.drugName}>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="font-semibold text-slate-900">
                      {item.drugName}
                    </p>
                    <p className="text-sm text-slate-500">{item.rate}%</p>
                  </div>

                  <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-blue-600"
                      style={{ width: `${item.rate}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'prescription' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-slate-900">처방전</h2>

              {prescriptions.map((prescription) => (
                <div
                  key={prescription.id}
                  className="rounded-2xl border border-slate-200 p-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-900">
                        {prescription.title}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {prescription.date}
                      </p>
                    </div>

                    <Badge
                      variant={
                        prescription.status === '복용 중' ? 'green' : 'gray'
                      }
                    >
                      {prescription.status}
                    </Badge>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {prescription.medicines.map((medicine) => (
                      <Badge key={medicine} variant="blue">
                        {medicine}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      <Card className="border-red-100 bg-red-50">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-bold text-red-700">회원 탈퇴</h2>

            <p className="mt-2 text-sm text-red-600">
              탈퇴 시 복약 일정, 상담 내역, 알림 설정 등 계정 관련 정보가
              비활성화됩니다.
            </p>
          </div>

          <Button type="button" variant="danger">
            회원 탈퇴
          </Button>
        </div>
      </Card>
    </div>
  );
}

export default MyPage;
