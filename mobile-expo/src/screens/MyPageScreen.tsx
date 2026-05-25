import { useState } from "react";
import { Text } from "react-native";

import { api } from "../api/client";
import { useAppContext } from "../context/AppContext";
import { Button, Screen, SectionCard } from "../ui";

export function MyPageScreen({ navigation }: any) {
  const { session, settings, clearSession } = useAppContext();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    if (!session) return;

    setLoading(true);

    try {
      await api.logout(settings, session);
    } catch {
      // Ignore logout request failures and still clear local session.
    } finally {
      await clearSession();
      setLoading(false);
    }
  };

  return (
    <Screen>
      <SectionCard
        title="내 정보"
        subtitle="현재 로그인한 계정 정보와 사용자 메뉴를 이곳에서 한 번에 관리할 수 있습니다."
      >
        <Text style={{ color: "#35574e", fontWeight: "700" }}>이메일</Text>
        <Text style={{ color: "#10332b", fontSize: 16 }}>{session?.email || "-"}</Text>
        <Text style={{ color: "#35574e", fontWeight: "700" }}>권한</Text>
        <Text style={{ color: "#10332b", fontSize: 16 }}>{session?.role || "-"}</Text>
      </SectionCard>

      <SectionCard
        title="내 메뉴"
        subtitle="웹 사용자 메뉴에서 자주 쓰는 항목들을 모바일 흐름에 맞게 모아두었습니다."
      >
        <Button title="전체 일정 목록" onPress={() => navigation.navigate("MySchedules")} secondary />
        <Button title="주의 약/성분 관리" onPress={() => navigation.navigate("MyCautions")} secondary />
        <Button title="FAQ" onPress={() => navigation.navigate("MyFaq")} secondary />
        <Button title="알림" onPress={() => navigation.navigate("MyNotifications")} secondary />
        <Button title="회원 탈퇴" onPress={() => navigation.navigate("AccountDelete")} secondary />
      </SectionCard>

      <SectionCard
        title="계정"
        subtitle="현재 세션을 종료하고 로그인 화면으로 돌아갈 수 있습니다."
      >
        <Button title="로그아웃" onPress={handleLogout} loading={loading} />
      </SectionCard>
    </Screen>
  );
}
