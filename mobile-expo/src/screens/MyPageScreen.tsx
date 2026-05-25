import { useState } from "react";
import { Text } from "react-native";

import { api } from "../api/client";
import { useAppContext } from "../context/AppContext";
import { Button, Screen, SectionCard } from "../ui";

export function MyPageScreen() {
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
      <SectionCard title="내 정보" subtitle="현재 로그인한 계정 정보를 확인할 수 있습니다.">
        <Text style={{ color: "#35574e", fontWeight: "700" }}>이메일</Text>
        <Text style={{ color: "#10332b", fontSize: 16 }}>{session?.email || "-"}</Text>
        <Text style={{ color: "#35574e", fontWeight: "700" }}>권한</Text>
        <Text style={{ color: "#10332b", fontSize: 16 }}>{session?.role || "-"}</Text>
        <Button title="로그아웃" onPress={handleLogout} loading={loading} />
      </SectionCard>
    </Screen>
  );
}
