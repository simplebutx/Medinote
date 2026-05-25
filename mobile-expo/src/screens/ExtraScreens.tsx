import { useState } from "react";
import { Pressable, Text, View } from "react-native";

import { Button, InfoBanner, Screen, SectionCard } from "../ui";

export function PrescriptionUploadScreen() {
  return (
    <Screen>
      <SectionCard
        title="처방전 업로드"
        subtitle="처방전 사진을 올리고 OCR로 약 이름과 복약 정보를 읽어오는 흐름이 들어올 자리입니다."
      >
        <View
          style={{
            borderWidth: 1,
            borderColor: "#d9e7e2",
            borderRadius: 22,
            padding: 18,
            backgroundColor: "#fbfdfc",
            gap: 10,
          }}
        >
          <Text style={{ color: "#10332b", fontSize: 18, fontWeight: "800" }}>
            사진 업로드 준비 중
          </Text>
          <Text style={{ color: "#547066", lineHeight: 22 }}>
            처방전 촬영, 업로드 진행 상태, OCR 추출 결과 확인 같은 단계를 이 화면에 연결할 예정입니다.
          </Text>
          <InfoBanner text="지금은 UI 자리만 잡아둔 상태입니다." />
        </View>
      </SectionCard>
    </Screen>
  );
}

const faqItems = [
  {
    question: "약 검색은 어떤 정보를 보여주나요?",
    answer: "약 이름, 회사명, 효능, 복용법, 주의사항, 부작용 정보를 확인할 수 있습니다.",
  },
  {
    question: "주의 약/성분은 어디서 관리하나요?",
    answer: "내 정보 메뉴 안의 주의 약/성분 관리 화면에서 등록, 수정, 삭제할 수 있습니다.",
  },
  {
    question: "복약 일정은 어떻게 등록하나요?",
    answer: "복약 일정 탭에서 달력을 확인한 뒤 우측 상단 + 버튼을 눌러 직접 입력으로 등록할 수 있습니다.",
  },
  {
    question: "챗봇에는 어떤 질문을 할 수 있나요?",
    answer: "복약 관련 궁금증이나 약 이름이 포함된 질문을 입력해 상담형 답변을 받을 수 있습니다.",
  },
];

export function FaqScreen() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <Screen>
      <SectionCard
        title="FAQ"
        subtitle="사용자 화면에서 자주 묻는 질문을 한곳에 모아봤습니다."
      >
        {faqItems.map((item, index) => {
          const opened = openIndex === index;

          return (
            <Pressable
              key={item.question}
              onPress={() => setOpenIndex(opened ? null : index)}
              style={{
                borderWidth: 1,
                borderColor: opened ? "#0f766e" : "#d9e7e2",
                borderRadius: 18,
                padding: 16,
                backgroundColor: opened ? "#edf7f5" : "#ffffff",
                gap: 8,
              }}
            >
              <Text style={{ color: "#10332b", fontSize: 16, fontWeight: "800" }}>
                {item.question}
              </Text>
              {opened ? (
                <Text style={{ color: "#547066", lineHeight: 22 }}>{item.answer}</Text>
              ) : null}
            </Pressable>
          );
        })}
      </SectionCard>
    </Screen>
  );
}

const notificationItems = [
  "복약 시간이 가까워졌을 때 알림",
  "등록한 일정이 끝나갈 때 알림",
  "추후 처방전 OCR 결과 확인 알림",
];

export function NotificationsScreen() {
  return (
    <Screen>
      <SectionCard
        title="알림"
        subtitle="앱에서 어떤 알림을 줄 수 있는지 미리 확인하는 화면입니다."
      >
        {notificationItems.map((item) => (
          <View
            key={item}
            style={{
              borderWidth: 1,
              borderColor: "#d9e7e2",
              borderRadius: 18,
              padding: 16,
              backgroundColor: "#fbfdfc",
            }}
          >
            <Text style={{ color: "#10332b", fontWeight: "700" }}>{item}</Text>
          </View>
        ))}
        <InfoBanner text="실제 푸시 알림 연동은 아직 연결 전입니다." />
      </SectionCard>
    </Screen>
  );
}

export function AccountDeleteScreen() {
  const [message, setMessage] = useState("");

  return (
    <Screen>
      <SectionCard
        title="회원 탈퇴"
        subtitle="계정 삭제 전에 확인해야 할 내용을 먼저 보여주는 화면입니다."
      >
        <View
          style={{
            borderWidth: 1,
            borderColor: "#f3c9c2",
            borderRadius: 18,
            padding: 16,
            backgroundColor: "#fff6f4",
            gap: 8,
          }}
        >
          <Text style={{ color: "#8a271a", fontWeight: "800", fontSize: 16 }}>
            탈퇴 전에 확인해 주세요
          </Text>
          <Text style={{ color: "#7a4a43", lineHeight: 22 }}>
            복약 일정, 주의 약/성분, 프로필 정보가 함께 정리될 수 있으므로 실제 연결 전에는 안내용 화면으로만 두고 있습니다.
          </Text>
        </View>

        {message ? <InfoBanner text={message} tone="danger" /> : null}

        <Button
          title="회원 탈퇴 요청"
          onPress={() => setMessage("실제 회원 탈퇴 API는 아직 연결하지 않았습니다.")}
        />
      </SectionCard>
    </Screen>
  );
}
