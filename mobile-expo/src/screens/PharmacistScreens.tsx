import { useState } from "react";
import { Alert, Text, View } from "react-native";

import { api, getErrorMessage } from "../api/client";
import {
  AppButton,
  Badge,
  Card,
  EmptyState,
  Field,
  Hero,
  KeyValue,
  ListRow,
  LoadingState,
  Screen,
  SectionTitle,
  Segmented,
  Toolbar,
} from "../components/ui";
import { colors } from "../constants";
import { useAppContext } from "../context/AppContext";
import { formatDateTime, toNumber, useAsyncData } from "../hooks";
import type { ConsultRoom, PharmacyInventory } from "../types";

export function PharmacistPendingScreen() {
  const { clearSession, session } = useAppContext();

  return (
    <Screen>
      <Hero
        title="승인 대기"
        subtitle="약사 계정은 관리자 승인이 완료된 뒤 전체 메뉴를 사용할 수 있습니다."
      />
      <Card>
        <KeyValue label="현재 상태" value={session?.status ?? "PENDING"} />
        <Text style={{ color: colors.muted, lineHeight: 22 }}>
          승인 전에는 대시보드, 상담 관리, 재고 관리 화면 접근이 제한됩니다.
        </Text>
        <AppButton title="다른 계정으로 로그인" icon="log-out-outline" variant="danger" onPress={clearSession} />
      </Card>
    </Screen>
  );
}

export function PharmacistDashboardScreen({ navigation }: { navigation: any }) {
  const { settings, session } = useAppContext();
  const pending = useAsyncData(
    () => api.getPendingConsultRooms(settings, session!),
    [settings, session],
    { enabled: Boolean(session), silent: true }
  );
  const active = useAsyncData(
    () => api.getActiveConsultRooms(settings, session!),
    [settings, session],
    { enabled: Boolean(session), silent: true }
  );
  const completed = useAsyncData(
    () => api.getCompletedConsultRooms(settings, session!),
    [settings, session],
    { enabled: Boolean(session), silent: true }
  );
  const feedback = useAsyncData(
    () => api.getConsultFeedbackStats(settings, session!),
    [settings, session],
    { enabled: Boolean(session), silent: true }
  );

  return (
    <Screen>
      <Hero title="약사 대시보드" subtitle="웹 대시보드의 상담 상태와 평점 요약을 모바일 카드로 압축했습니다." />
      <View style={{ flexDirection: "row", gap: 10 }}>
        <Card style={{ flex: 1 }}>
          <Text style={{ color: colors.muted, fontWeight: "800" }}>대기</Text>
          <Text style={{ color: colors.text, fontSize: 28, fontWeight: "900" }}>
            {pending.data?.length ?? 0}
          </Text>
        </Card>
        <Card style={{ flex: 1 }}>
          <Text style={{ color: colors.muted, fontWeight: "800" }}>진행</Text>
          <Text style={{ color: colors.text, fontSize: 28, fontWeight: "900" }}>
            {active.data?.length ?? 0}
          </Text>
        </Card>
      </View>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <Card style={{ flex: 1 }}>
          <Text style={{ color: colors.muted, fontWeight: "800" }}>완료</Text>
          <Text style={{ color: colors.text, fontSize: 28, fontWeight: "900" }}>
            {completed.data?.length ?? 0}
          </Text>
        </Card>
        <Card style={{ flex: 1 }}>
          <Text style={{ color: colors.muted, fontWeight: "800" }}>평점</Text>
          <Text style={{ color: colors.text, fontSize: 28, fontWeight: "900" }}>
            {feedback.data?.averageRating?.toFixed?.(1) ?? "-"}
          </Text>
        </Card>
      </View>
      <SectionTitle title="빠른 이동" />
      <ListRow icon="chatbubbles-outline" title="상담 관리" onPress={() => navigation.navigate("PharmConsultsTab")} />
      <ListRow icon="cube-outline" title="재고 관리" onPress={() => navigation.navigate("PharmInventoryTab")} />
      <ListRow icon="search-outline" title="약 검색" onPress={() => navigation.navigate("PharmMoreTab", { screen: "PharmDrugs" })} />
    </Screen>
  );
}

type ConsultMode = "PENDING" | "ACTIVE" | "COMPLETED";

export function PharmacistConsultsScreen() {
  const { settings, session } = useAppContext();
  const [mode, setMode] = useState<ConsultMode>("PENDING");
  const [selected, setSelected] = useState<ConsultRoom | null>(null);

  const loader = () => {
    if (mode === "PENDING") return api.getPendingConsultRooms(settings, session!);
    if (mode === "ACTIVE") return api.getActiveConsultRooms(settings, session!);
    return api.getCompletedConsultRooms(settings, session!);
  };

  const rooms = useAsyncData(loader, [settings, session, mode], {
    enabled: Boolean(session),
    silent: true,
  });

  const messages = useAsyncData(
    () => api.getConsultMessages(settings, session!, selected!.roomId),
    [settings, session, selected?.roomId],
    { enabled: Boolean(session && selected), silent: true }
  );

  const patient = useAsyncData(
    () => api.getConsultPatientInfo(settings, session!, selected!.roomId),
    [settings, session, selected?.roomId],
    { enabled: Boolean(session && selected), silent: true }
  );

  const match = async (roomId: number) => {
    if (!session) return;
    try {
      await api.matchConsultRoom(settings, session, roomId);
      await rooms.reload();
    } catch (error) {
      Alert.alert("매칭 실패", getErrorMessage(error));
    }
  };

  const close = async (roomId: number) => {
    if (!session) return;
    try {
      await api.closeConsultRoom(settings, session, roomId);
      await rooms.reload();
    } catch (error) {
      Alert.alert("종료 실패", getErrorMessage(error));
    }
  };

  const summary = async (roomId: number) => {
    if (!session) return;
    try {
      const result = await api.generateConsultSummary(settings, session, roomId);
      Alert.alert("요약 요청 완료", result || "AI 요약 요청이 완료되었습니다.");
    } catch (error) {
      Alert.alert("요약 실패", getErrorMessage(error));
    }
  };

  return (
    <Screen>
      <Hero title="상담 관리" subtitle="상담방 목록, 매칭, 종료, 환자 정보 조회를 제공합니다." />
      <Segmented<ConsultMode>
        value={mode}
        onChange={(next) => {
          setMode(next);
          setSelected(null);
        }}
        options={[
          { value: "PENDING", label: "대기" },
          { value: "ACTIVE", label: "진행" },
          { value: "COMPLETED", label: "완료" },
        ]}
      />
      <AppButton title="새로고침" icon="refresh-outline" variant="secondary" onPress={rooms.reload} />
      {rooms.loading ? <LoadingState /> : null}
      {(rooms.data ?? []).map((room) => (
        <ListRow
          key={room.roomId}
          icon="people-outline"
          title={`상담방 #${room.roomId}`}
          subtitle={`${room.customerName ?? "환자"} · ${room.status ?? mode} · ${formatDateTime(room.createdAt)}`}
          right={selected?.roomId === room.roomId ? <Badge label="선택" tone="info" /> : null}
          onPress={() => setSelected(room)}
        />
      ))}
      {!rooms.loading && !(rooms.data ?? []).length ? <EmptyState title="상담방이 없습니다." /> : null}
      {selected ? (
        <Card>
          <Text style={{ color: colors.text, fontSize: 17, fontWeight: "900" }}>
            상담방 #{selected.roomId}
          </Text>
          <Toolbar>
            {mode === "PENDING" ? (
              <AppButton title="매칭" icon="link-outline" onPress={() => void match(selected.roomId)} />
            ) : null}
            {mode === "ACTIVE" ? (
              <AppButton title="종료" icon="checkmark-done-outline" variant="secondary" onPress={() => void close(selected.roomId)} />
            ) : null}
            <AppButton title="AI 요약" icon="sparkles-outline" variant="ghost" onPress={() => void summary(selected.roomId)} />
          </Toolbar>
          <SectionTitle title="환자 정보" />
          {patient.data ? (
            <>
              <KeyValue label="이름" value={patient.data.username || patient.data.customerName} />
              <KeyValue label="이메일" value={patient.data.email} />
              <KeyValue label="생년월일" value={patient.data.birthDate} />
              <KeyValue label="질환" value={patient.data.chronicDiseases?.join(", ")} />
            </>
          ) : null}
          <SectionTitle title="메시지" />
          {(messages.data ?? []).map((item, index) => (
            <ListRow
              key={`${item.messageId ?? index}`}
              icon={item.senderType === "PHARMACIST" ? "medkit-outline" : "person-outline"}
              title={item.senderType || "MESSAGE"}
              subtitle={item.message || item.content || ""}
            />
          ))}
        </Card>
      ) : null}
    </Screen>
  );
}

export function PharmacistPatientsScreen() {
  const { settings, session } = useAppContext();
  const active = useAsyncData(
    () => api.getActiveConsultRooms(settings, session!),
    [settings, session],
    { enabled: Boolean(session), silent: true }
  );
  const completed = useAsyncData(
    () => api.getCompletedConsultRooms(settings, session!),
    [settings, session],
    { enabled: Boolean(session), silent: true }
  );

  const rooms = [...(active.data ?? []), ...(completed.data ?? [])];

  return (
    <Screen>
      <Hero title="환자 조회" subtitle="상담 이력이 있는 환자 정보를 상담방 기준으로 확인합니다." />
      <AppButton
        title="새로고침"
        icon="refresh-outline"
        variant="secondary"
        onPress={() => {
          void active.reload();
          void completed.reload();
        }}
      />
      {!rooms.length && !active.loading && !completed.loading ? (
        <EmptyState title="조회 가능한 환자가 없습니다." />
      ) : null}
      {rooms.map((room) => (
        <Card key={`${room.status}-${room.roomId}`}>
          <Text style={{ color: colors.text, fontSize: 17, fontWeight: "900" }}>
            {room.customerName || `환자 #${room.customerId ?? room.customId ?? "-"}`}
          </Text>
          <KeyValue label="상담방" value={room.roomId} />
          <KeyValue label="상태" value={room.status} />
          <KeyValue label="첫 메시지" value={room.firstMessage} />
          <KeyValue label="피드백" value={room.feedbackComment || room.comment} />
          {room.rating ? <Badge label={`${room.rating}점`} tone="warning" /> : null}
        </Card>
      ))}
    </Screen>
  );
}

export function PharmacistInventoryScreen() {
  const { settings, session } = useAppContext();
  const inventory = useAsyncData(
    () => api.getMyPharmacyInventory(settings, session!),
    [settings, session],
    { enabled: Boolean(session), silent: true }
  );
  const [pharmacyHpid, setPharmacyHpid] = useState("");
  const [itemSeq, setItemSeq] = useState("");
  const [itemName, setItemName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [stockQuantity, setStockQuantity] = useState("10");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!session || !pharmacyHpid.trim() || !itemSeq.trim() || !itemName.trim()) {
      Alert.alert("입력 확인", "약국 코드, 품목 코드, 약 이름을 입력해 주세요.");
      return;
    }
    setSaving(true);
    try {
      await api.upsertPharmacyInventory(settings, session, {
        pharmacyHpid: pharmacyHpid.trim(),
        itemSeq: itemSeq.trim(),
        itemName: itemName.trim(),
        companyName,
        stockQuantity: toNumber(stockQuantity, 0),
      });
      setItemSeq("");
      setItemName("");
      setCompanyName("");
      await inventory.reload();
    } catch (error) {
      Alert.alert("저장 실패", getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (item: PharmacyInventory) => {
    if (!session) return;
    const id = item.id ?? item.inventoryId;
    if (!id) return;
    try {
      await api.deletePharmacyInventory(settings, session, id);
      await inventory.reload();
    } catch (error) {
      Alert.alert("삭제 실패", getErrorMessage(error));
    }
  };

  return (
    <Screen>
      <Hero title="재고 관리" subtitle="웹 재고 관리 화면을 빠른 등록과 목록 관리로 옮겼습니다." />
      <Card>
        <Field label="약국 HPID" value={pharmacyHpid} onChangeText={setPharmacyHpid} />
        <Field label="품목 코드" value={itemSeq} onChangeText={setItemSeq} />
        <Field label="약 이름" value={itemName} onChangeText={setItemName} />
        <Field label="제조사" value={companyName} onChangeText={setCompanyName} />
        <Field label="재고 수량" value={stockQuantity} onChangeText={setStockQuantity} keyboardType="numeric" />
        <AppButton title={saving ? "저장 중" : "재고 저장"} icon="save-outline" onPress={save} disabled={saving} />
      </Card>
      <SectionTitle title="내 재고" action={<AppButton title="새로고침" variant="ghost" onPress={inventory.reload} />} />
      {inventory.loading ? <LoadingState /> : null}
      {(inventory.data ?? []).map((item) => (
        <ListRow
          key={`${item.id ?? item.inventoryId}-${item.itemSeq}`}
          icon="cube-outline"
          title={item.itemName || "약 이름 없음"}
          subtitle={`${item.companyName ?? "-"} · ${item.pharmacyHpid ?? "-"} · ${item.stockQuantity ?? 0}개`}
          right={<AppButton title="삭제" variant="ghost" onPress={() => void remove(item)} />}
        />
      ))}
      {!inventory.loading && !(inventory.data ?? []).length ? <EmptyState title="등록된 재고가 없습니다." /> : null}
    </Screen>
  );
}

export function PharmacistMoreScreen({ navigation }: { navigation: any }) {
  return (
    <Screen>
      <Hero title="더보기" subtitle="웹 약사 사이드바의 나머지 메뉴입니다." />
      <ListRow
        icon="people-outline"
        title="환자 조회"
        subtitle="상담 이력이 있는 환자를 확인합니다."
        onPress={() => navigation.navigate("PharmPatients")}
      />
      <ListRow
        icon="search-outline"
        title="약 검색"
        subtitle="약 정보를 검색합니다."
        onPress={() => navigation.navigate("PharmDrugs")}
      />
      <ListRow
        icon="notifications-outline"
        title="알림"
        subtitle="상담과 복약 관련 알림을 확인합니다."
        onPress={() => navigation.navigate("PharmNotifications")}
      />
      <ListRow
        icon="person-circle-outline"
        title="약사 마이페이지"
        subtitle="약사 프로필을 확인합니다."
        onPress={() => navigation.navigate("PharmMyPage")}
      />
    </Screen>
  );
}
