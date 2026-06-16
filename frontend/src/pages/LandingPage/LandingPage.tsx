import { Link } from 'react-router-dom';

import { Badge, Button, Card } from '../../components/ui';

const painPoints = [
  {
    icon: '💊',
    title: '약 이름이 헷갈려요',
    description: '여러 약을 복용하다 보면 어떤 약인지 기억하기 어렵습니다.',
    iconBg: 'bg-rose-500/20',
  },
  {
    icon: '⏰',
    title: '복용 시간을 자주 놓쳐요',
    description: '바쁜 일상 속에서 정해진 복약 시간을 놓치기 쉽습니다.',
    iconBg: 'bg-yellow-500/20',
  },
  {
    icon: '🤔',
    title: '같이 먹어도 될지 걱정돼요',
    description: '복용 중인 약의 주의사항과 병용 여부가 궁금합니다.',
    iconBg: 'bg-blue-500/20',
  },
  {
    icon: '👩‍⚕️',
    title: '전문가에게 묻고 싶어요',
    description: 'AI 답변만으로 부족할 때 약사 상담이 필요합니다.',
    iconBg: 'bg-emerald-500/20',
  },
];

const features = [
  {
    icon: '📄',
    title: '처방전 OCR',
    description: '처방전 사진으로 약 정보를 더 쉽게 등록합니다.',
    badge: 'OCR',
  },
  {
    icon: '📅',
    title: '복약 일정 관리',
    description: '복용 시간과 주기를 관리하고 오늘 일정을 확인합니다.',
    badge: '일정',
  },
  {
    icon: '🔔',
    title: '복약 알림',
    description: '놓치기 쉬운 복약 시간을 알림으로 안내합니다.',
    badge: '알림',
  },
  {
    icon: '🤖',
    title: 'AI 복약 상담',
    description: '복약법, 주의사항, 병용 관련 질문을 할 수 있습니다.',
    badge: 'AI',
  },
  {
    icon: '🩺',
    title: '약사 상담 연결',
    description: 'AI 답변이 어려운 경우 약사 상담으로 이어집니다.',
    badge: '상담',
  },
  {
    icon: '📍',
    title: '근처 약국 찾기',
    description: '지도와 약 검색으로 재고 보유 약국을 찾습니다.',
    badge: '지도',
  },
];

const serviceFlow = [
  {
    step: '01',
    icon: '📄',
    title: '약 등록',
    description: '직접 입력하거나 처방전으로 약 정보를 등록합니다.',
  },
  {
    step: '02',
    icon: '🧾',
    title: 'OCR 분석',
    description: '처방전 정보를 읽고 약 등록 흐름을 돕습니다.',
  },
  {
    step: '03',
    icon: '📅',
    title: '일정 관리',
    description: '복용 시간, 복용량, 기간을 일정으로 관리합니다.',
  },
  {
    step: '04',
    icon: '🤖',
    title: 'AI 상담',
    description: '복약 관련 질문을 AI에게 먼저 물어볼 수 있습니다.',
  },
  {
    step: '05',
    icon: '👩‍⚕️',
    title: '약사 연결',
    description: '전문 확인이 필요하면 약사 상담으로 이어집니다.',
  },
  {
    step: '06',
    icon: '📍',
    title: '재고 검색',
    description: '근처 약국과 재고 보유 약국을 확인합니다.',
  },
];

const pharmacistItems = [
  {
    title: 'AI 답변 한계 감지',
    description: 'AI가 답변하기 어려운 질문은 상담 전환 흐름으로 연결합니다.',
  },
  {
    title: '사용자 복약 정보 참고',
    description: '복용 중인 약과 상담 내용을 바탕으로 상담을 진행합니다.',
  },
  {
    title: '실시간 상담',
    description: '사용자와 약사가 채팅으로 상담을 이어갈 수 있습니다.',
  },
  {
    title: '상담 내역 관리',
    description: '진행 중 상담과 종료된 상담 기록을 확인할 수 있습니다.',
  },
];

const trustItems = [
  {
    icon: '🔒',
    title: '복약 정보 중심 설계',
    description: '사용자가 등록한 약 정보와 복약 일정을 기준으로 기능이 연결됩니다.',
  },
  {
    icon: '🩺',
    title: '전문가 상담 연결',
    description: 'AI 답변이 부족한 경우 약사 상담으로 이어지는 흐름을 제공합니다.',
  },
  {
    icon: '📍',
    title: '약국·재고 탐색',
    description: '지도 기반 약국 조회와 약 이름 기반 재고 검색을 제공합니다.',
  },
];

const faqs = [
  {
    question: 'Medinote는 어떤 서비스인가요?',
    answer:
      '복약 일정, 약 정보, AI 상담, 약사 상담, 근처 약국 재고 검색을 하나의 흐름으로 관리하는 AI 기반 스마트 복약 관리 플랫폼입니다.',
  },
  {
    question: 'AI 답변만으로 복약 판단을 해도 되나요?',
    answer:
      'AI 답변은 참고용입니다. 이상 증상, 심각한 부작용, 과다 복용이 의심되는 경우 의료기관이나 전문가 상담이 필요합니다.',
  },
  {
    question: '스마트 약통은 바로 사용할 수 있나요?',
    answer:
      '네, 현재 사용 가능합니다. 4개 슬롯에 복약 일정을 연결하면 거리 센서가 약 복용 여부를 자동으로 감지합니다. 내 정보 페이지에서 처방 내역을 슬롯에 연결한 뒤 스마트 약통 페이지에서 측정을 시작하면 됩니다.',
  },
];

const heroMetrics = [
  {
    label: '오늘 복약',
    value: '3건',
    description: '완료 1건 · 예정 2건',
  },
  {
    label: '상담 흐름',
    value: 'AI → 약사',
    description: '전문 확인이 필요한 질문 연결',
  },
  {
    label: '약국 탐색',
    value: '근처·재고',
    description: '지도와 약 이름 기반 검색',
  },
];

const schedulePreview = [
  {
    title: '아침 복약',
    time: '08:00',
    description: '식후 30분',
    badge: '완료',
    variant: 'green',
  },
  {
    title: '점심 복약',
    time: '13:00',
    description: '알림 대기 중',
    badge: '예정',
    variant: 'blue',
  },
  {
    title: '저녁 복약',
    time: '19:00',
    description: '복약 전 확인 필요',
    badge: '대기',
    variant: 'gray',
  },
] as const;

const chatPreview = [
  {
    sender: 'user',
    name: '사용자',
    message: '감기약이랑 평소 먹는 혈압약을 같이 먹어도 될까요?',
  },
  {
    sender: 'ai',
    name: 'Medinote AI',
    message: '복용 중인 약 정보를 확인하고, 주의가 필요한 경우 약사 상담을 안내합니다.',
  },
];

const containerClass = 'mx-auto max-w-7xl px-5 sm:px-6 lg:px-8';

const sectionClass = 'py-20 sm:py-24';

const eyebrowClass = 'text-sm font-bold text-blue-600';

const titleClass = 'mt-3 text-3xl font-extrabold text-slate-950 sm:text-4xl';

const descriptionClass = 'mt-4 text-base leading-7 text-slate-500';

const darkCardClass =
  'rounded-2xl border border-white/10 bg-white/[0.06] p-5 shadow-sm backdrop-blur transition hover:-translate-y-1 hover:bg-white/[0.09] hover:border-white/20';

const iconBadgeClass =
  'flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-xl';

const gradientButtonClass =
  'border border-white/30 bg-white/10 text-white hover:bg-white/20';

const outlineButtonClass =
  '!border !border-slate-300 !bg-white !text-slate-700 hover:!bg-slate-50';

const FlowArrow = () => (
  <div className="hidden shrink-0 items-center justify-center sm:flex">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-5 w-5 text-slate-300"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  </div>
);

function LandingPage() {
  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900">
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/85 backdrop-blur-xl">
        <div className={`${containerClass} flex h-16 items-center justify-between`}>
          <Link
            to="/"
            className="flex items-center gap-2 text-xl font-extrabold text-blue-600"
          >
            <img src="/medinote-logo.svg" alt="Medinote" className="h-8 w-8" />
            Medinote
          </Link>

          <nav className="hidden items-center gap-7 text-sm font-semibold text-slate-600 md:flex">
            <a href="#features" className="transition hover:text-blue-600">
              주요 기능
            </a>
            <a href="#flow" className="transition hover:text-blue-600">
              이용 흐름
            </a>
            <a href="#pharmacist" className="transition hover:text-blue-600">
              약사 상담
            </a>
            <a href="#safety" className="transition hover:text-blue-600">
              안전 안내
            </a>
            <a href="#faq" className="transition hover:text-blue-600">
              FAQ
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <Link to="/login">
              <Button type="button" className={outlineButtonClass}>
                로그인
              </Button>
            </Link>

            <Link to="/signup">
              <Button type="button">무료 시작</Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="overflow-hidden border-b border-slate-200 bg-white">
          <div className={`${containerClass} grid gap-12 py-16 sm:py-20 lg:min-h-[calc(100vh-4rem)] lg:grid-cols-[0.95fr_1.05fr] lg:items-center`}>
            <div className="text-center lg:text-left">
              <Badge variant="blue">처방전 OCR · 복약 알림 · 약사 상담</Badge>

              <h1 className="mt-6 text-4xl font-extrabold leading-tight text-slate-950 sm:text-5xl md:text-6xl">
                오늘 먹을 약부터
                <br />
                전문가 상담까지
                <br />
                <span className="whitespace-nowrap"><span className="text-blue-600">한 곳에서 관리</span>하세요.</span>
              </h1>

              <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600 lg:mx-0">
                Medinote는 복약 일정을 놓치지 않도록 돕고, 약 정보가 헷갈릴 때
                AI 상담과 약사 상담으로 이어지는 복약 관리 서비스입니다.
              </p>

              <div className="mt-8 flex flex-wrap justify-center gap-3 lg:justify-start">
                <Link to="/signup">
                  <Button type="button" className="px-6 py-3">
                    무료로 시작하기
                  </Button>
                </Link>

                <Link to="/login">
                  <Button
                    type="button"
                    className="!border !border-slate-300 !bg-white px-6 py-3 !text-slate-700 hover:!bg-slate-50"
                  >
                    로그인하기
                  </Button>
                </Link>
              </div>

              <p className="mx-auto mt-4 max-w-lg text-sm leading-6 text-slate-500 lg:mx-0">
                AI 답변은 참고용이며, 이상 증상이나 부작용이 의심되면 전문가 상담을
                권장합니다.
              </p>

              <div className="mx-auto mt-8 grid max-w-2xl gap-3 sm:grid-cols-3 lg:mx-0">
                {heroMetrics.map((item) => (
                  <div key={item.label} className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-left">
                    <p className="text-xs font-bold text-slate-500">{item.label}</p>
                    <p className="mt-2 text-lg font-extrabold text-slate-950">{item.value}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* App preview card */}
            <div className="relative">
              <div className="rounded-2xl border border-slate-200 bg-slate-950 p-3 shadow-2xl shadow-slate-200">
                <div className="rounded-xl bg-white">
                  <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-bold text-blue-600">
                        복약 관리 현황
                      </p>
                      <h2 className="mt-1 text-xl font-extrabold text-slate-950">
                        오늘의 복약 관리
                      </h2>
                    </div>
                    <Badge variant="green">안정적으로 진행 중</Badge>
                  </div>

                  <div className="grid gap-0 lg:grid-cols-[0.95fr_1.05fr]">
                    <div className="border-b border-slate-200 p-5 lg:border-b-0 lg:border-r">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-bold text-slate-900">복약 일정</p>
                          <p className="mt-1 text-xs text-slate-500">오늘 등록된 일정 3건</p>
                        </div>
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                          67%
                        </span>
                      </div>

                      <div className="mt-5 space-y-3">
                        {schedulePreview.map((item) => (
                          <div
                            key={item.title}
                            className="rounded-xl border border-slate-200 bg-white p-4"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <p className="text-sm font-bold text-slate-900">
                                  {item.title}
                                </p>
                                <p className="mt-1 text-sm text-slate-500">
                                  {item.time} · {item.description}
                                </p>
                              </div>
                              <Badge variant={item.variant}>{item.badge}</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="p-5">
                      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                        <p className="text-sm font-bold text-slate-900">AI 상담 추천</p>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          복용 중인 약의 주의사항이 궁금하다면 먼저 AI에게 질문하고,
                          필요한 경우 약사 상담으로 이어갈 수 있습니다.
                        </p>
                      </div>

                      {/* Chat bubbles */}
                      <div className="mt-4 space-y-3">
                        {chatPreview.map((chat) => (
                          <div
                            key={chat.name}
                            className={[
                              'flex',
                              chat.sender === 'user' ? 'justify-end' : 'justify-start',
                            ].join(' ')}
                          >
                            <div
                              className={[
                                'max-w-[85%] rounded-2xl px-4 py-3',
                                chat.sender === 'user'
                                  ? 'rounded-tr-sm bg-blue-600 text-white'
                                  : 'rounded-tl-sm bg-slate-100 text-slate-700',
                              ].join(' ')}
                            >
                              <p
                                className={[
                                  'mb-1 text-xs font-bold',
                                  chat.sender === 'user'
                                    ? 'text-blue-200'
                                    : 'text-blue-600',
                                ].join(' ')}
                              >
                                {chat.name}
                              </p>
                              <p className="text-sm leading-6">{chat.message}</p>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-4 rounded-xl bg-slate-950 p-4 text-white">
                        <p className="text-sm font-bold">전문 확인 필요</p>
                        <p className="mt-2 text-sm leading-6 text-slate-300">
                          고위험 질문은 무리하게 답하지 않고 약사 상담을 권장합니다.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pain Points */}
        <section className={`${sectionClass} bg-slate-950 text-white`}>
          <div className={containerClass}>
            <div className="text-center">
              <span className="rounded-full bg-white/10 px-4 py-2 text-xs font-bold text-blue-100">
                복약 관리가 어려운 순간
              </span>

              <h2 className="mt-5 text-3xl font-extrabold">
                약 먹는 시간, 자주 놓치고 있지 않나요?
              </h2>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {painPoints.map((point) => (
                <div key={point.title} className={darkCardClass}>
                  <div className={`flex h-11 w-11 items-center justify-center rounded-2xl text-xl ${point.iconBg}`}>
                    {point.icon}
                  </div>

                  <h3 className="mt-4 font-bold text-white">{point.title}</h3>

                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    {point.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className={`${sectionClass} bg-white`}>
          <div className={containerClass}>
            <div className="max-w-2xl">
              <p className={eyebrowClass}>주요 기능</p>

              <h2 className={titleClass}>
                복약 관리의 모든 것, 한 앱으로
              </h2>

              <p className={descriptionClass}>
                약 등록부터 상담, 재고 검색까지 필요한 기능을 한 흐름으로 제공합니다.
              </p>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <Card
                  key={feature.title}
                  className="h-full border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className={iconBadgeClass}>{feature.icon}</span>
                    <Badge variant="blue">{feature.badge}</Badge>
                  </div>

                  <h3 className="mt-5 text-xl font-bold text-slate-900">
                    {feature.title}
                  </h3>

                  <p className="mt-3 text-sm leading-6 text-slate-500">
                    {feature.description}
                  </p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Service Flow */}
        <section id="flow" className={`${sectionClass} bg-slate-50`}>
          <div className={`${containerClass} text-center`}>
            <p className="text-sm font-semibold text-blue-600">서비스 흐름</p>

            <h2 className="mt-3 text-3xl font-extrabold text-slate-950">
              약 등록부터 상담까지 자연스럽게 이어집니다.
            </h2>

            <p className="mx-auto mt-4 max-w-2xl text-slate-500">
              Medinote는 복약 데이터를 중심으로 일정, 상담, 재고 검색을 연결합니다.
            </p>

            <div className="mt-12 space-y-3">
              {/* Row 1: steps 1–3 */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch sm:gap-2">
                {serviceFlow.slice(0, 3).map((flow, idx) => (
                  <div key={flow.step} className="flex flex-1 items-center gap-2">
                    <div className="group flex-1 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-md">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-blue-50 text-2xl transition group-hover:bg-blue-100">
                        {flow.icon}
                      </div>
                      <p className="mt-4 text-xs font-extrabold text-blue-600">
                        {flow.step}
                      </p>
                      <h3 className="mt-2 font-bold text-slate-900">{flow.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        {flow.description}
                      </p>
                    </div>
                    {idx < 2 && <FlowArrow />}
                  </div>
                ))}
              </div>

              {/* Row 2: steps 4–6 */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch sm:gap-2">
                {serviceFlow.slice(3).map((flow, idx) => (
                  <div key={flow.step} className="flex flex-1 items-center gap-2">
                    <div className="group flex-1 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-md">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-blue-50 text-2xl transition group-hover:bg-blue-100">
                        {flow.icon}
                      </div>
                      <p className="mt-4 text-xs font-extrabold text-blue-600">
                        {flow.step}
                      </p>
                      <h3 className="mt-2 font-bold text-slate-900">{flow.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        {flow.description}
                      </p>
                    </div>
                    {idx < 2 && <FlowArrow />}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-10">
              <Link to="/signup">
                <Button type="button">지금 바로 시작하기</Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Pharmacist */}
        <section
          id="pharmacist"
          className={`${sectionClass} bg-gradient-to-br from-slate-950 via-blue-950 to-emerald-900 text-white`}
        >
          <div className={containerClass}>
            <div className="max-w-2xl">
              <span className="rounded-full bg-white/10 px-4 py-2 text-xs font-bold text-blue-100">
                전문가 상담 연결
              </span>

              <h2 className="mt-5 text-3xl font-extrabold">
                AI만으로 부족한 순간,
                <br />
                약사 상담으로 이어집니다.
              </h2>

              <p className="mt-4 leading-7 text-blue-100">
                Medinote는 AI 상담에서 끝나지 않고, 전문 확인이 필요한 질문을
                약사 상담 흐름으로 연결합니다.
              </p>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {pharmacistItems.map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-white/10 bg-white/[0.08] p-5 shadow-sm backdrop-blur transition hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.12]"
                >
                  <h3 className="font-bold text-white">{item.title}</h3>

                  <p className="mt-3 text-sm leading-6 text-blue-100">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-8">
              <Link to="/signup">
                <Button type="button" className={gradientButtonClass}>
                  약사로 가입하기
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Safety */}
        <section id="safety" className={`${sectionClass} bg-white`}>
          <div className={containerClass}>
            <div className="text-center">
              <p className="text-sm font-semibold text-blue-600">안전한 안내</p>

              <h2 className="mt-3 text-3xl font-extrabold text-slate-950">
                AI가 판단을 대신하지 않도록 설계했습니다.
              </h2>

              <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-500">
                Medinote는 복약 정보를 정리하고 질문을 돕는 서비스입니다. 정확한
                진단이나 처방 변경이 필요한 상황에서는 전문가 상담으로 이어지도록
                안내합니다.
              </p>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {trustItems.map((item) => (
                <Card
                  key={item.title}
                  className="border border-slate-200 bg-white shadow-sm"
                >
                  <div className="flex items-start gap-4">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-50 text-xl">
                      {item.icon}
                    </span>

                    <div>
                      <h3 className="font-bold text-slate-900">{item.title}</h3>

                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="bg-slate-50 py-20">
          <div className="mx-auto max-w-3xl px-6">
            <div className="text-center">
              <p className="text-sm font-semibold text-blue-600">FAQ</p>

              <h2 className="mt-3 text-3xl font-extrabold text-slate-950">
                궁금한 점이 있으신가요?
              </h2>
            </div>

            <div className="mt-10 space-y-3">
              {faqs.map((faq) => (
                <details
                  key={faq.question}
                  className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold text-slate-900">
                    {faq.question}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>

                  <p className="mt-3 text-sm leading-6 text-slate-500">
                    {faq.answer}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section
          id="start"
          className="bg-gradient-to-br from-blue-600 via-blue-700 to-emerald-700 px-6 py-20 text-white"
        >
          <div className="mx-auto max-w-7xl text-center">
            <p className="text-sm font-semibold text-blue-100">
              복약 관리 시작
            </p>

            <h2 className="mt-3 text-3xl font-extrabold">
              오늘부터 복약 흐름을 한 곳에서 정리하세요.
            </h2>

            <p className="mx-auto mt-4 max-w-2xl text-blue-100">
              약 등록, 알림, AI 상담, 약사 상담, 근처 약국 재고 검색을 따로 흩어두지
              않고 Medinote에서 이어서 관리할 수 있습니다.
            </p>

            <div className="mt-8 flex justify-center gap-3">
              <Link to="/signup">
                <Button
                  type="button"
                  className="!bg-white !text-blue-600 hover:!bg-blue-50"
                >
                  무료로 시작하기
                </Button>
              </Link>

              <Link to="/login">
                <Button
                  type="button"
                  className="!border !border-white/70 !bg-transparent !text-white hover:!bg-white/10"
                >
                  로그인하기
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-slate-950 text-slate-400">
        <div className={`${containerClass} flex flex-col gap-8 py-10 md:flex-row md:items-start md:justify-between`}>
          <div>
            <p className="text-lg font-extrabold text-white">Medinote</p>
            <p className="mt-3 max-w-sm text-sm leading-6">
              AI 기반 스마트 복약 관리 플랫폼
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 text-sm md:grid-cols-3">
            <div>
              <p className="font-bold text-white">서비스</p>
              <div className="mt-3 space-y-2">
                <p>복약 일정</p>
                <p>AI 상담</p>
                <p>약사 상담</p>
              </div>
            </div>

            <div>
              <p className="font-bold text-white">기능</p>
              <div className="mt-3 space-y-2">
                <p>재고 검색</p>
                <p>스마트 약통</p>
                <p>복약 알림</p>
              </div>
            </div>

            <div>
              <p className="font-bold text-white">안내</p>
              <div className="mt-3 space-y-2">
                <p>FAQ</p>
                <p>로그인</p>
                <p>회원가입</p>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 px-5 py-5 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 text-xs md:flex-row md:items-center md:justify-between">
            <p>© 2026 Medinote. All rights reserved.</p>
            <p>복약 정보는 참고용이며, 정확한 판단은 전문가와 상담해주세요.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
