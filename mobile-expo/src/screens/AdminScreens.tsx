import { useState } from "react";
import { Alert, Text, View } from "react-native";

import { api, getErrorMessage } from "../api/client";
import {
  AppButton,
  Badge,
  Card,
  EmptyState,
  Hero,
  KeyValue,
  ListRow,
  LoadingState,
  Screen,
  SectionTitle,
} from "../components/ui";
import { colors } from "../constants";
import { useAppContext } from "../context/AppContext";
import { formatDateTime, useAsyncData } from "../hooks";

export function AdminDashboardScreen({ navigation }: { navigation: any }) {
  const { settings, session } = useAppContext();
  const stats = useAsyncData(
    () => api.getAdminStats(settings, session!),
    [settings, session],
    { enabled: Boolean(session), silent: true }
  );
  const syncStatus = useAsyncData(
    () => api.getMedicineSyncStatus(settings, session!),
    [settings, session],
    { enabled: Boolean(session), silent: true }
  );
  const [syncing, setSyncing] = useState(false);

  const runSync = async () => {
    if (!session) return;
    setSyncing(true);
    try {
      await api.syncMedicines(settings, session);
      await syncStatus.reload();
      Alert.alert("동기화 완료", "의약품 동기화를 요청했습니다.");
    } catch (error) {
      Alert.alert("동기화 실패", getErrorMessage(error));
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Screen>
      <Hero title="관리자 대시보드" subtitle="웹 관리자 대시보드의 통계와 의약품 동기화를 옮겼습니다." />
      {stats.loading ? <LoadingState /> : null}
      <View style={{ flexDirection: "row", gap: 10 }}>
        <Card style={{ flex: 1 }}>
          <Text style={{ color: colors.muted, fontWeight: "800" }}>회원</Text>
          <Text style={{ color: colors.text, fontSize: 28, fontWeight: "900" }}>
            {stats.data?.totalUserCount ?? 0}
          </Text>
        </Card>
        <Card style={{ flex: 1 }}>
          <Text style={{ color: colors.muted, fontWeight: "800" }}>약사</Text>
          <Text style={{ color: colors.text, fontSize: 28, fontWeight: "900" }}>
            {stats.data?.totalPharmacistCount ?? 0}
          </Text>
        </Card>
      </View>
      <Card>
        <Text style={{ color: colors.muted, fontWeight: "800" }}>승인 대기 약사</Text>
        <Text style={{ color: colors.text, fontSize: 34, fontWeight: "900" }}>
          {stats.data?.pendingPharmacistCount ?? 0}
        </Text>
        <AppButton
          title="약사 승인 관리"
          icon="shield-checkmark-outline"
          onPress={() => navigation.navigate("AdminPharmacistsTab")}
        />
      </Card>
      <SectionTitle title="의약품 데이터" />
      <Card>
        <KeyValue label="상태" value={JSON.stringify(syncStatus.data ?? {}, null, 2)} />
        <AppButton
          title={syncing ? "동기화 중" : "의약품 동기화"}
          icon="sync-outline"
          variant="secondary"
          onPress={runSync}
          disabled={syncing}
        />
      </Card>
    </Screen>
  );
}

export function AdminMembersScreen() {
  const { settings, session } = useAppContext();
  const users = useAsyncData(
    () => api.getAdminUsers(settings, session!),
    [settings, session],
    { enabled: Boolean(session), silent: true }
  );

  const remove = async (id: number) => {
    if (!session) return;
    try {
      await api.deleteAdminUser(settings, session, id);
      await users.reload();
    } catch (error) {
      Alert.alert("삭제 실패", getErrorMessage(error));
    }
  };

  return (
    <Screen>
      <Hero title="회원 관리" subtitle="웹 회원 관리 테이블을 모바일 목록으로 옮겼습니다." />
      <AppButton title="새로고침" icon="refresh-outline" variant="secondary" onPress={users.reload} />
      {users.loading ? <LoadingState /> : null}
      {(users.data ?? []).map((user) => (
        <Card key={user.id}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
            <Text style={{ color: colors.text, fontSize: 17, fontWeight: "900", flex: 1 }}>
              {user.username}
            </Text>
            <Badge label={user.role} tone={user.role === "ADMIN" ? "danger" : "info"} />
          </View>
          <KeyValue label="이메일" value={user.email} />
          <KeyValue label="상태" value={user.status} />
          <KeyValue label="가입일" value={formatDateTime(user.createdAt)} />
          <AppButton title="회원 삭제" icon="trash-outline" variant="ghost" onPress={() => void remove(user.id)} />
        </Card>
      ))}
      {!users.loading && !(users.data ?? []).length ? <EmptyState title="회원이 없습니다." /> : null}
    </Screen>
  );
}

export function AdminPharmacistsScreen() {
  const { settings, session } = useAppContext();
  const pending = useAsyncData(
    () => api.getPendingPharmacists(settings, session!),
    [settings, session],
    { enabled: Boolean(session), silent: true }
  );

  const approve = async (userId: number) => {
    if (!session) return;
    try {
      await api.approvePharmacist(settings, session, userId);
      await pending.reload();
    } catch (error) {
      Alert.alert("승인 실패", getErrorMessage(error));
    }
  };

  const reject = async (userId: number) => {
    if (!session) return;
    try {
      await api.rejectPharmacist(settings, session, userId);
      await pending.reload();
    } catch (error) {
      Alert.alert("거절 실패", getErrorMessage(error));
    }
  };

  return (
    <Screen>
      <Hero title="약사 관리" subtitle="약사 승인 대기 목록과 승인/거절 액션을 제공합니다." />
      <AppButton title="새로고침" icon="refresh-outline" variant="secondary" onPress={pending.reload} />
      {pending.loading ? <LoadingState /> : null}
      {(pending.data ?? []).map((item) => (
        <Card key={item.userId}>
          <Text style={{ color: colors.text, fontSize: 17, fontWeight: "900" }}>
            {item.username}
          </Text>
          <KeyValue label="이메일" value={item.email} />
          <KeyValue label="소속 약국 번호" value={item.docNumber} />
          <KeyValue label="면허 번호" value={item.licenseNumber} />
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <AppButton title="승인" icon="checkmark-outline" onPress={() => void approve(item.userId)} />
            </View>
            <View style={{ flex: 1 }}>
              <AppButton title="거절" icon="close-outline" variant="danger" onPress={() => void reject(item.userId)} />
            </View>
          </View>
        </Card>
      ))}
      {!pending.loading && !(pending.data ?? []).length ? (
        <EmptyState title="승인 대기 중인 약사가 없습니다." />
      ) : null}
    </Screen>
  );
}

export function AdminMoreScreen({ navigation }: { navigation: any }) {
  const { clearSession } = useAppContext();

  return (
    <Screen>
      <Hero title="관리자 메뉴" subtitle="웹 관리자 사이드바 메뉴입니다." />
      <ListRow
        icon="people-outline"
        title="회원 관리"
        subtitle="회원 목록 조회와 삭제"
        onPress={() => navigation.navigate("AdminMembersTab")}
      />
      <ListRow
        icon="medkit-outline"
        title="약사 관리"
        subtitle="승인 대기 약사 처리"
        onPress={() => navigation.navigate("AdminPharmacistsTab")}
      />
      <ListRow
        icon="log-out-outline"
        title="로그아웃"
        subtitle="관리자 세션 종료"
        onPress={clearSession}
      />
    </Screen>
  );
}
