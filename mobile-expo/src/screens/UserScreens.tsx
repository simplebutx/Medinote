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
import { colors, dosageUnitOptions } from "../constants";
import { useAppContext } from "../context/AppContext";
import { formatDateTime, todayString, toNumber, useAsyncData } from "../hooks";
import type {
  ChatbotMessage,
  ChatbotRoom,
  ConsultRoom,
  DosageUnit,
  MedicationSchedule,
} from "../types";

type ScheduleMode = "TODAY" | "LIST" | "FORM";

function scheduleMedicines(schedule: MedicationSchedule) {
  return schedule.medicines || schedule.medicationScheduleMedicines || [];
}

export function ScheduleScreen() {
  const { settings, session } = useAppContext();
  const [mode, setMode] = useState<ScheduleMode>("TODAY");
  const [date, setDate] = useState(todayString());
  const [hospitalName, setHospitalName] = useState("");
  const [pharmacyName, setPharmacyName] = useState("");
  const [startDate, setStartDate] = useState(todayString());
  const [durationDays, setDurationDays] = useState("7");
  const [medicineName, setMedicineName] = useState("");
  const [dosageAmount, setDosageAmount] = useState("1");
  const [dosageUnit, setDosageUnit] = useState<DosageUnit>("TABLET");
  const [timesPerDay, setTimesPerDay] = useState("3");
  const [saving, setSaving] = useState(false);

  const daily = useAsyncData(
    () => api.getDailySchedules(settings, session!, date),
    [settings, session, date],
    { enabled: Boolean(session) && mode === "TODAY", silent: true }
  );

  const schedules = useAsyncData(
    () => api.getSchedules(settings, session!),
    [settings, session, mode],
    { enabled: Boolean(session) && mode === "LIST", silent: true }
  );

  const createSchedule = async () => {
    if (!session || !medicineName.trim()) {
      Alert.alert("입력 확인", "약 이름을 입력해 주세요.");
      return;
    }

    setSaving(true);
    try {
      await api.createSchedule(settings, session, {
        hospitalName: hospitalName || null,
        pharmacyName: pharmacyName || null,
        startDate,
        durationDays: toNumber(durationDays, 1),
        medicines: [
          {
            customMedicineName: medicineName.trim(),
            dosageAmount: toNumber(dosageAmount, 1),
            dosageUnit,
            timesPerDay: toNumber(timesPerDay, 1),
            durationDays: toNumber(durationDays, 1),
          },
        ],
      });
      setMedicineName("");
      setHospitalName("");
      setPharmacyName("");
      Alert.alert("등록 완료", "복약 일정이 등록되었습니다.");
      setMode("LIST");
      await schedules.reload();
    } catch (error) {
      Alert.alert("등록 실패", getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const removeSchedule = async (id: number) => {
    if (!session) return;
    try {
      await api.deleteSchedule(settings, session, id);
      await schedules.reload();
    } catch (error) {
      Alert.alert("삭제 실패", getErrorMessage(error));
    }
  };

  const markTaken = async (item: {
    medicationScheduleId?: number;
    medicationScheduleTimeId?: number;
    scheduledAt?: string | null;
  }) => {
    if (!session || !item.medicationScheduleId || !item.medicationScheduleTimeId) return;
    try {
      await api.createIntakeLog(settings, session, {
        medicationScheduleId: item.medicationScheduleId,
        medicationScheduleTimeId: item.medicationScheduleTimeId,
        status: "TAKEN",
        scheduledAt: item.scheduledAt || `${date}T00:00:00`,
        takenAt: new Date().toISOString(),
      });
      await daily.reload();
    } catch (error) {
      Alert.alert("기록 실패", getErrorMessage(error));
    }
  };

  return (
    <Screen>
      <Hero title="복약 일정" subtitle="웹 일정 페이지를 오늘 일정, 전체 목록, 등록 폼으로 나눴습니다." />
      <Segmented<ScheduleMode>
        value={mode}
        onChange={setMode}
        options={[
          { value: "TODAY", label: "오늘" },
          { value: "LIST", label: "목록" },
          { value: "FORM", label: "등록" },
        ]}
      />

      {mode === "TODAY" ? (
        <>
          <Card>
            <Field label="조회 날짜" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />
            <AppButton title="새로고침" icon="refresh-outline" variant="secondary" onPress={daily.reload} />
          </Card>
          {daily.loading ? <LoadingState /> : null}
          {daily.data?.groups?.length ? (
            daily.data.groups.map((group) => (
              <Card key={group.takeTime}>
                <Text style={{ color: colors.text, fontSize: 18, fontWeight: "900" }}>
                  {group.takeTime}
                </Text>
                {group.medications.map((item, index) => (
                  <ListRow
                    key={`${group.takeTime}-${index}`}
                    icon="time-outline"
                    title={item.customMedicineName || `약 #${item.medicineId ?? "-"}`}
                    subtitle={`${item.dosageAmount ?? "-"} ${item.dosageUnit ?? ""} · ${item.timing ?? ""}`}
                    right={
                      item.intakeStatus === "TAKEN" ? (
                        <Badge label="복용" tone="success" />
                      ) : (
                        <AppButton title="복용" variant="secondary" onPress={() => void markTaken(item)} />
                      )
                    }
                  />
                ))}
              </Card>
            ))
          ) : !daily.loading ? (
            <EmptyState title="해당 날짜의 복약 일정이 없습니다." icon="calendar-outline" />
          ) : null}
        </>
      ) : null}

      {mode === "LIST" ? (
        <>
          <AppButton title="목록 새로고침" icon="refresh-outline" variant="secondary" onPress={schedules.reload} />
          {schedules.loading ? <LoadingState /> : null}
          {(schedules.data ?? []).map((schedule) => (
            <Card key={schedule.id}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
                <Text style={{ color: colors.text, fontSize: 17, fontWeight: "900", flex: 1 }}>
                  {scheduleMedicines(schedule)
                    .map((item) => item.customMedicineName)
                    .filter(Boolean)
                    .join(", ") || `일정 #${schedule.id}`}
                </Text>
                <Badge label={schedule.isActive === false ? "중지" : "활성"} tone={schedule.isActive === false ? "neutral" : "success"} />
              </View>
              <KeyValue label="병원" value={schedule.hospitalName} />
              <KeyValue label="약국" value={schedule.pharmacyName} />
              <KeyValue label="기간" value={`${schedule.startDate ?? "-"} ~ ${schedule.endDate ?? "-"} (${schedule.durationDays ?? "-"}일)`} />
              <AppButton title="삭제" icon="trash-outline" variant="ghost" onPress={() => void removeSchedule(schedule.id)} />
            </Card>
          ))}
          {!schedules.loading && !(schedules.data ?? []).length ? (
            <EmptyState title="등록된 복약 일정이 없습니다." />
          ) : null}
        </>
      ) : null}

      {mode === "FORM" ? (
        <Card>
          <Field label="병원명" value={hospitalName} onChangeText={setHospitalName} />
          <Field label="약국명" value={pharmacyName} onChangeText={setPharmacyName} />
          <Field label="시작일" value={startDate} onChangeText={setStartDate} placeholder="YYYY-MM-DD" />
          <Field label="복용 기간(일)" value={durationDays} onChangeText={setDurationDays} keyboardType="numeric" />
          <Field label="약 이름" value={medicineName} onChangeText={setMedicineName} />
          <Field label="1회 용량" value={dosageAmount} onChangeText={setDosageAmount} keyboardType="numeric" />
          <Segmented<DosageUnit> value={dosageUnit} onChange={setDosageUnit} options={dosageUnitOptions} />
          <Field label="하루 복용 횟수" value={timesPerDay} onChangeText={setTimesPerDay} keyboardType="numeric" />
          <AppButton
            title={saving ? "등록 중" : "일정 등록"}
            icon="add-circle-outline"
            onPress={createSchedule}
            disabled={saving}
          />
        </Card>
      ) : null}
    </Screen>
  );
}

type ChatMode = "BOT" | "CONSULT";

export function ChatScreen() {
  const { settings, session } = useAppContext();
  const [mode, setMode] = useState<ChatMode>("BOT");
  const [selectedRoom, setSelectedRoom] = useState<ChatbotRoom | null>(null);
  const [selectedConsultRoom, setSelectedConsultRoom] = useState<ConsultRoom | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const rooms = useAsyncData(
    () => api.getChatbotRooms(settings, session!),
    [settings, session],
    { enabled: Boolean(session) && mode === "BOT", silent: true }
  );

  const messages = useAsyncData(
    () => api.getChatbotMessages(settings, session!, selectedRoom!.roomId),
    [settings, session, selectedRoom?.roomId],
    { enabled: Boolean(session && selectedRoom && mode === "BOT"), silent: true }
  );

  const consultRooms = useAsyncData(
    () => api.getMyConsultRooms(settings, session!),
    [settings, session],
    { enabled: Boolean(session) && mode === "CONSULT", silent: true }
  );

  const consultMessages = useAsyncData(
    () => api.getConsultMessages(settings, session!, selectedConsultRoom!.roomId),
    [settings, session, selectedConsultRoom?.roomId],
    { enabled: Boolean(session && selectedConsultRoom && mode === "CONSULT"), silent: true }
  );

  const createRoom = async () => {
    if (!session) return;
    try {
      const room = await api.createChatbotRoom(settings, session, "새 상담");
      setSelectedRoom(room);
      await rooms.reload();
    } catch (error) {
      Alert.alert("채팅방 생성 실패", getErrorMessage(error));
    }
  };

  const sendBot = async () => {
    if (!session || !selectedRoom || !message.trim()) return;
    setSending(true);
    try {
      await api.sendChatbotMessage(settings, session, {
        roomId: selectedRoom.roomId,
        message: message.trim(),
      });
      setMessage("");
      await messages.reload();
    } catch (error) {
      Alert.alert("전송 실패", getErrorMessage(error));
    } finally {
      setSending(false);
    }
  };

  const createConsult = async () => {
    if (!session) return;
    try {
      const created = await api.createConsultRoom(settings, session);
      const roomId =
        typeof created === "object" && created !== null
          ? Number(created.roomId ?? created.id)
          : Number(created);
      Alert.alert("상담 요청 완료", `상담방 #${roomId}이 생성되었습니다.`);
      await consultRooms.reload();
      setMode("CONSULT");
    } catch (error) {
      Alert.alert("상담 요청 실패", getErrorMessage(error));
    }
  };

  return (
    <Screen>
      <Hero title="챗봇 & 상담" subtitle="웹 채팅 페이지의 챗봇과 약사 상담 기능을 함께 제공합니다." />
      <Segmented<ChatMode>
        value={mode}
        onChange={setMode}
        options={[
          { value: "BOT", label: "챗봇" },
          { value: "CONSULT", label: "약사 상담" },
        ]}
      />

      {mode === "BOT" ? (
        <>
          <Toolbar>
            <AppButton title="새 챗봇방" icon="add-outline" onPress={createRoom} />
            <AppButton title="새로고침" icon="refresh-outline" variant="secondary" onPress={rooms.reload} />
          </Toolbar>
          <SectionTitle title="챗봇방" />
          {rooms.loading ? <LoadingState /> : null}
          {(rooms.data ?? []).map((room) => (
            <ListRow
              key={room.roomId}
              icon="chatbubble-ellipses-outline"
              title={room.title || `챗봇방 #${room.roomId}`}
              subtitle={formatDateTime(room.updatedAt || room.createdAt)}
              right={selectedRoom?.roomId === room.roomId ? <Badge label="선택" tone="info" /> : null}
              onPress={() => setSelectedRoom(room)}
            />
          ))}
          {!rooms.loading && !(rooms.data ?? []).length ? <EmptyState title="챗봇방이 없습니다." /> : null}
          {selectedRoom ? (
            <Card>
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: "900" }}>
                {selectedRoom.title || `챗봇방 #${selectedRoom.roomId}`}
              </Text>
              {(messages.data ?? []).map((item: ChatbotMessage, index) => (
                <View
                  key={`${item.messageId ?? index}`}
                  style={{
                    alignSelf: item.senderType === "USER" ? "flex-end" : "flex-start",
                    maxWidth: "92%",
                    borderRadius: 8,
                    padding: 12,
                    backgroundColor: item.senderType === "USER" ? colors.primary : colors.bg,
                  }}
                >
                  <Text style={{ color: item.senderType === "USER" ? "#FFFFFF" : colors.text }}>
                    {item.content || item.answer}
                  </Text>
                </View>
              ))}
              <Field label="메시지" value={message} onChangeText={setMessage} multiline />
              <AppButton
                title={sending ? "전송 중" : "보내기"}
                icon="send-outline"
                onPress={sendBot}
                disabled={sending}
              />
            </Card>
          ) : null}
        </>
      ) : (
        <>
          <Toolbar>
            <AppButton title="상담 요청" icon="person-add-outline" onPress={createConsult} />
            <AppButton title="새로고침" icon="refresh-outline" variant="secondary" onPress={consultRooms.reload} />
          </Toolbar>
          {(consultRooms.data ?? []).map((room) => (
            <ListRow
              key={room.roomId}
              icon="people-outline"
              title={`상담방 #${room.roomId}`}
              subtitle={`${room.status ?? ""} · ${formatDateTime(room.createdAt)}`}
              right={selectedConsultRoom?.roomId === room.roomId ? <Badge label="선택" tone="info" /> : null}
              onPress={() => setSelectedConsultRoom(room)}
            />
          ))}
          {!consultRooms.loading && !(consultRooms.data ?? []).length ? (
            <EmptyState title="상담 내역이 없습니다." />
          ) : null}
          {selectedConsultRoom ? (
            <Card>
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: "900" }}>
                상담방 #{selectedConsultRoom.roomId}
              </Text>
              {(consultMessages.data ?? []).map((item, index) => (
                <ListRow
                  key={`${item.messageId ?? index}`}
                  title={item.senderType || "MESSAGE"}
                  subtitle={item.message || item.content || ""}
                  icon={item.senderType === "PHARMACIST" ? "medkit-outline" : "person-outline"}
                />
              ))}
            </Card>
          ) : null}
        </>
      )}
    </Screen>
  );
}

export function UserMoreScreen({ navigation }: { navigation: any }) {
  return (
    <Screen>
      <Hero title="더보기" subtitle="웹 사이드바의 나머지 사용자 메뉴입니다." />
      <ListRow
        icon="location-outline"
        title="근처 약국"
        subtitle="지도 대신 좌표 기반 약국 목록을 확인합니다."
        onPress={() => navigation.navigate("UserPharmacies")}
      />
      <ListRow
        icon="notifications-outline"
        title="알림"
        subtitle="복약과 상담 알림을 확인합니다."
        onPress={() => navigation.navigate("UserNotifications")}
      />
      <ListRow
        icon="hardware-chip-outline"
        title="스마트 약통"
        subtitle="IoT 연동 상태를 확인합니다."
        onPress={() => navigation.navigate("UserIot")}
      />
      <ListRow
        icon="person-circle-outline"
        title="마이페이지"
        subtitle="프로필과 주의 약/성분을 관리합니다."
        onPress={() => navigation.navigate("UserMyPage")}
      />
    </Screen>
  );
}
