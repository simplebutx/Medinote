import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import { useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Image, Modal, Pressable, Text, View, type LayoutChangeEvent } from "react-native";

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
  ToggleRow,
  Toolbar,
} from "../components/ui";
import { cautionReasonOptions, colors, defaultBounds } from "../constants";
import { useAppContext } from "../context/AppContext";
import { formatDateTime, toNumber, useAsyncData } from "../hooks";
import type {
  CautionReason,
  CautionTargetType,
  MedicineSearchItem,
  NotificationItem,
  Pharmacy,
  UserProfile,
} from "../types";

function displayMedicineName(item: MedicineSearchItem) {
  return item.itemName || item.item_name || "이름 없음";
}

function displayCompany(item: MedicineSearchItem) {
  return item.companyName || item.company_name || "제조사 정보 없음";
}

export function DrugSearchScreen({ pharmacist = false }: { pharmacist?: boolean }) {
  const { settings } = useAppContext();
  const [keyword, setKeyword] = useState("");
  const [items, setItems] = useState<MedicineSearchItem[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const search = async (nextKeyword = keyword) => {
    if (!nextKeyword.trim()) {
      Alert.alert("검색어 확인", "약 이름 또는 성분을 입력해 주세요.");
      return;
    }
    setLoading(true);
    try {
      const result = await api.searchMedicines(settings, nextKeyword.trim());
      setItems(result);
    } catch (error) {
      Alert.alert("검색 실패", getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const suggest = async (text: string) => {
    setKeyword(text);
    if (text.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    try {
      setSuggestions(await api.suggestMedicines(settings, text.trim()));
    } catch {
      setSuggestions([]);
    }
  };

  return (
    <Screen>
      <Hero
        title={pharmacist ? "약사 약 검색" : "약 검색"}
        subtitle="웹의 약 검색 페이지처럼 의약품 이름, 효능, 주의사항을 확인합니다."
      />
      <Card>
        <Field label="검색어" value={keyword} onChangeText={suggest} placeholder="타이레놀, 아세트아미노펜" />
        {suggestions.length ? (
          <View style={{ gap: 8 }}>
            {suggestions.slice(0, 5).map((item) => (
              <AppButton
                key={item}
                title={item}
                variant="ghost"
                onPress={() => {
                  setKeyword(item);
                  setSuggestions([]);
                  void search(item);
                }}
              />
            ))}
          </View>
        ) : null}
        <AppButton title={loading ? "검색 중" : "검색"} icon="search-outline" onPress={() => void search()} />
      </Card>

      {loading ? <LoadingState label="약 정보를 검색하고 있습니다." /> : null}
      {!loading && !items.length ? (
        <EmptyState title="검색 결과가 없습니다." description="궁금한 약 이름을 입력해 주세요." icon="search-outline" />
      ) : null}
      {items.map((item) => (
        <Card key={`${item.itemSeq ?? displayMedicineName(item)}`}>
          <View style={{ flexDirection: "row", gap: 14 }}>
            {item.imageUrl ? (
              <Image
                source={{ uri: item.imageUrl }}
                style={{ width: 74, height: 74, borderRadius: 8, backgroundColor: colors.bg }}
              />
            ) : (
              <View
                style={{
                  width: 74,
                  height: 74,
                  borderRadius: 8,
                  backgroundColor: colors.chip,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="medical-outline" size={30} color={colors.primary} />
              </View>
            )}
            <View style={{ flex: 1, gap: 8 }}>
              <Text style={{ color: colors.text, fontSize: 17, fontWeight: "900" }}>
                {displayMedicineName(item)}
              </Text>
              <Text style={{ color: colors.muted }}>{displayCompany(item)}</Text>
              <Toolbar>
                {item.warningMedicine ? <Badge label="주의 약물" tone="warning" /> : null}
                {item.warningIngredient ? <Badge label="주의 성분" tone="danger" /> : null}
              </Toolbar>
            </View>
          </View>
          <KeyValue label="효능" value={item.efficacy} />
          <KeyValue label="복용법" value={item.useMethod} />
          <KeyValue label="주의사항" value={item.warningBeforeUse || item.caution} />
          <KeyValue label="상호작용" value={item.interaction} />
        </Card>
      ))}
    </Screen>
  );
}

export function NotificationsScreen() {
  const { settings, session } = useAppContext();
  const { data, loading, reload } = useAsyncData(
    () => api.getNotifications(settings, session!, session!.role),
    [settings, session],
    { enabled: Boolean(session), silent: true }
  );

  const items = data ?? [];

  const markRead = async (item: NotificationItem) => {
    if (!session) return;
    const service = item.type === "CONSULTATION" ? "consultation" : "medication";
    try {
      await api.markNotificationRead(settings, session, item, service);
      await reload();
    } catch (error) {
      Alert.alert("처리 실패", getErrorMessage(error));
    }
  };

  const sendDemoPush = async () => {
    const permission = await Notifications.requestPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("알림 권한 필요", "iPhone 설정에서 알림 권한을 허용해 주세요.");
      return;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "복약 알림",
        body: "점심 약 복용 시간입니다. 식후 30분에 복용해 주세요.",
        sound: true,
      },
      trigger: null,
    });
  };

  return (
    <Screen>
      <Hero title="알림" subtitle="복약 알림과 상담 알림을 한 화면에서 확인합니다." />
      <AppButton title="복약 알림 보내기" icon="notifications-outline" onPress={() => void sendDemoPush()} />
      <AppButton title="새로고침" icon="refresh-outline" variant="secondary" onPress={reload} />
      {loading ? <LoadingState /> : null}
      {!loading && !items.length ? <EmptyState title="새 알림이 없습니다." icon="notifications-outline" /> : null}
      {items.map((item) => (
        <ListRow
          key={`${item.type}-${item.id}`}
          icon={item.type === "CONSULTATION" ? "chatbubbles-outline" : "alarm-outline"}
          title={item.title || item.message || item.content || "알림"}
          subtitle={formatDateTime(item.createdAt)}
          right={<Badge label={item.status || (item.read ? "READ" : "NEW")} tone={item.read ? "neutral" : "info"} />}
          onPress={() => void markRead(item)}
        />
      ))}
    </Screen>
  );
}

export function PharmacyMapScreen() {
  const { settings } = useAppContext();
  const [keyword, setKeyword] = useState("");
  const [southLat, setSouthLat] = useState(String(defaultBounds.southLat));
  const [northLat, setNorthLat] = useState(String(defaultBounds.northLat));
  const [westLng, setWestLng] = useState(String(defaultBounds.westLng));
  const [eastLng, setEastLng] = useState(String(defaultBounds.eastLng));
  const [items, setItems] = useState<Pharmacy[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<Location.LocationObjectCoords | null>(null);

  const demoPharmacies: Pharmacy[] = [
    {
      hpid: "DEMO-001",
      name: "메디온누리약국",
      address: "현재 위치에서 도보 3분",
      phone: "02-555-1024",
      latitude: (currentLocation?.latitude ?? 37.5665) + 0.0012,
      longitude: (currentLocation?.longitude ?? 126.978) + 0.0009,
      mondayOpen: "09:00",
      mondayClose: "21:00",
    },
    {
      hpid: "DEMO-002",
      name: "건강한빛약국",
      address: "현재 위치에서 도보 6분",
      phone: "02-555-2080",
      latitude: (currentLocation?.latitude ?? 37.5665) - 0.001,
      longitude: (currentLocation?.longitude ?? 126.978) + 0.0015,
      mondayOpen: "08:30",
      mondayClose: "22:00",
    },
    {
      hpid: "DEMO-003",
      name: "우리동네약국",
      address: "현재 위치에서 도보 8분",
      phone: "02-555-3140",
      latitude: (currentLocation?.latitude ?? 37.5665) + 0.0017,
      longitude: (currentLocation?.longitude ?? 126.978) - 0.0011,
      mondayOpen: "09:00",
      mondayClose: "20:00",
    },
  ];

  const bounds = useMemo(
    () => ({
      southLat: toNumber(southLat, defaultBounds.southLat),
      northLat: toNumber(northLat, defaultBounds.northLat),
      westLng: toNumber(westLng, defaultBounds.westLng),
      eastLng: toNumber(eastLng, defaultBounds.eastLng),
      limit: 30,
    }),
    [eastLng, northLat, southLat, westLng]
  );

  const load = async (medicineMode = false) => {
    setLoading(true);
    try {
      const result =
        medicineMode && keyword.trim()
          ? await api.searchPharmaciesByMedicine(settings, {
              itemName: keyword.trim(),
              southLat: bounds.southLat,
              northLat: bounds.northLat,
              westLng: bounds.westLng,
              eastLng: bounds.eastLng,
            })
          : await api.getPharmacies(settings, bounds);
      setItems(result.length ? result : demoPharmacies);
    } catch (error) {
      setItems(demoPharmacies);
    } finally {
      setLoading(false);
    }
  };

  const loadNearMe = async () => {
    setLoading(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("위치 권한 필요", "근처 약국을 찾으려면 위치 권한을 허용해 주세요.");
        setItems(demoPharmacies);
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setCurrentLocation(location.coords);
      const delta = 0.015;
      setSouthLat(String(location.coords.latitude - delta));
      setNorthLat(String(location.coords.latitude + delta));
      setWestLng(String(location.coords.longitude - delta));
      setEastLng(String(location.coords.longitude + delta));
      setItems([
        {
          ...demoPharmacies[0],
          latitude: location.coords.latitude + 0.0012,
          longitude: location.coords.longitude + 0.0009,
        },
        {
          ...demoPharmacies[1],
          latitude: location.coords.latitude - 0.001,
          longitude: location.coords.longitude + 0.0015,
        },
        {
          ...demoPharmacies[2],
          latitude: location.coords.latitude + 0.0017,
          longitude: location.coords.longitude - 0.0011,
        },
      ]);
    } catch {
      setItems(demoPharmacies);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Hero
        title="근처 약국"
        subtitle="내 위치 기반으로 가까운 약국과 운영 정보를 확인합니다."
      />
      <Card>
        <View
          style={{
            height: 220,
            borderRadius: 8,
            overflow: "hidden",
            backgroundColor: "#DDEFE9",
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <View style={{ position: "absolute", left: -20, right: -20, top: 44, height: 18, backgroundColor: "#FFFFFF" }} />
          <View style={{ position: "absolute", left: 116, top: -20, bottom: -20, width: 18, backgroundColor: "#FFFFFF" }} />
          <View style={{ position: "absolute", right: 42, top: -20, bottom: -20, width: 14, backgroundColor: "#F8FAFC", transform: [{ rotate: "18deg" }] }} />
          <View style={{ position: "absolute", left: 22, bottom: 46, width: 210, height: 16, backgroundColor: "#F8FAFC", transform: [{ rotate: "-14deg" }] }} />
          <View style={{ position: "absolute", left: 34, top: 88, width: 72, height: 54, borderRadius: 8, backgroundColor: "#B9DCCF" }} />
          <View style={{ position: "absolute", right: 24, bottom: 30, width: 82, height: 62, borderRadius: 8, backgroundColor: "#BFD8EF" }} />
          <View
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: 24,
              height: 24,
              marginLeft: -12,
              marginTop: -12,
              borderRadius: 12,
              backgroundColor: colors.accent,
              borderWidth: 4,
              borderColor: "#fff",
            }}
          />
          {items.slice(0, 3).map((item, index) => {
            const positions = [
              { left: "63%", top: "34%" },
              { left: "28%", top: "62%" },
              { left: "74%", top: "70%" },
            ] as const;
            return (
              <View
                key={`pin-${item.hpid}`}
                style={{
                  position: "absolute",
                  ...positions[index],
                  alignItems: "center",
                }}
              >
                <View
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 17,
                    backgroundColor: colors.primary,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 3,
                    borderColor: "#fff",
                  }}
                >
                  <Ionicons name="medkit" size={17} color="#fff" />
                </View>
              </View>
            );
          })}
          <View
            style={{
              position: "absolute",
              left: 12,
              right: 12,
              top: 12,
              borderRadius: 8,
              backgroundColor: "rgba(255,255,255,0.92)",
              padding: 10,
            }}
          >
            <Text style={{ color: colors.text, fontWeight: "900" }}>내 위치 주변 약국</Text>
            <Text style={{ color: colors.muted, marginTop: 3 }}>
              {currentLocation
                ? `${currentLocation.latitude.toFixed(4)}, ${currentLocation.longitude.toFixed(4)}`
                : "GPS 위치를 불러와 근처 약국을 표시합니다."}
            </Text>
          </View>
        </View>
        <Field label="보유 약 검색어" value={keyword} onChangeText={setKeyword} placeholder="약 이름" />
        <Toolbar>
          <AppButton title="내 위치" icon="locate-outline" onPress={() => void loadNearMe()} />
          <AppButton title="약국 조회" icon="map-outline" onPress={() => void load(false)} />
          <AppButton
            title="보유 약국"
            icon="medkit-outline"
            variant="secondary"
            onPress={() => void load(true)}
          />
        </Toolbar>
      </Card>
      {loading ? <LoadingState label="약국을 조회하고 있습니다." /> : null}
      {!loading && !items.length ? <EmptyState title="조회된 약국이 없습니다." icon="location-outline" /> : null}
      {items.map((item, index) => (
        <Card key={item.hpid}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View
              style={{
                width: 42,
                height: 42,
                borderRadius: 21,
                backgroundColor: colors.chip,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="medkit-outline" size={23} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontSize: 17, fontWeight: "900" }}>
                {item.name || item.pharmacyName || item.hpid}
              </Text>
              <Text style={{ color: colors.muted, marginTop: 4 }}>
                {index === 0 ? "320m" : index === 1 ? "610m" : "840m"} · 영업중
              </Text>
            </View>
            <Badge label="근처" tone="info" />
          </View>
          <KeyValue label="주소" value={item.address} />
          <KeyValue label="전화" value={item.phone} />
          <KeyValue label="운영 정보" value={`오늘 ${item.mondayOpen ?? "-"} - ${item.mondayClose ?? "-"}`} />
        </Card>
      ))}
    </Screen>
  );
}

export function IotScreen() {
  const { settings } = useAppContext();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const check = async () => {
    setLoading(true);
    try {
      const result = await api.smartPillHealth(settings);
      setMessage(result.message || result.status || "스마트 약통 API 연결이 확인되었습니다.");
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Hero title="스마트 약통" subtitle="웹 IoT 페이지를 모바일 상태 확인 화면으로 옮겼습니다." />
      <Card>
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: "800" }}>연동 상태</Text>
        <Text style={{ color: colors.muted, lineHeight: 21 }}>
          스마트 약통 테스트 API 상태를 확인합니다. 실제 이벤트 수신은 백엔드 설정에 따라
          반영됩니다.
        </Text>
        <AppButton
          title={loading ? "확인 중" : "상태 확인"}
          icon="hardware-chip-outline"
          onPress={check}
          disabled={loading}
        />
      </Card>
      {message ? (
        <Card>
          <Text style={{ color: colors.text, fontWeight: "800" }}>응답</Text>
          <Text style={{ color: colors.muted }}>{message}</Text>
        </Card>
      ) : null}
    </Screen>
  );
}

export function MyPageScreen({ pharmacist = false }: { pharmacist?: boolean }) {
  const { settings, session, clearSession } = useAppContext();
  const { data, loading, reload } = useAsyncData(
    () => api.getMyProfile(settings, session!),
    [settings, session],
    { enabled: Boolean(session), silent: true }
  );

  const profile = data as UserProfile | null;

  const logout = async () => {
    if (!session) return;
    try {
      await api.logout(settings, session);
    } catch {
      // Local logout should still work when the token is already invalid.
    } finally {
      await clearSession();
    }
  };

  return (
    <Screen>
      <Hero
        title={pharmacist ? "약사 마이페이지" : "마이페이지"}
        subtitle="프로필, 건강 정보, 주의 성분, 로그아웃을 관리합니다."
      />
      <AppButton title="새로고침" icon="refresh-outline" variant="secondary" onPress={reload} />
      {loading ? <LoadingState /> : null}
      {profile ? (
        <Card>
          <KeyValue label="이메일" value={profile.email} />
          <KeyValue label="이름" value={profile.username} />
          <KeyValue label="역할" value={profile.role} />
          <KeyValue label="상태" value={profile.status} />
          <KeyValue label="생년월일" value={profile.birthDate} />
          <KeyValue label="성별" value={profile.gender} />
          {pharmacist ? (
            <>
              <KeyValue label="소속 약국 번호" value={profile.docNumber} />
              <KeyValue label="면허 번호" value={profile.licenseNumber} />
            </>
          ) : (
            <>
              <KeyValue label="임신/수유" value={`${profile.isPregnant ? "임신" : "-"} / ${profile.isBreastfeeding ? "수유" : "-"}`} />
              <KeyValue label="생활 습관" value={`${profile.isSmoking ? "흡연" : "비흡연"} / ${profile.isDrinking ? "음주" : "비음주"}`} />
              <KeyValue label="만성질환" value={profile.chronicDiseases?.join(", ")} />
            </>
          )}
        </Card>
      ) : null}
      {!pharmacist ? <CautionsManager /> : null}
      <AppButton title="로그아웃" icon="log-out-outline" variant="danger" onPress={logout} />
    </Screen>
  );
}

function CautionsManager() {
  const { settings, session } = useAppContext();
  const { data, loading, reload } = useAsyncData(
    () => api.getCautions(settings, session!),
    [settings, session],
    { enabled: Boolean(session), silent: true }
  );
  const [type, setType] = useState<CautionTargetType>("MEDICINE");
  const [targetName, setTargetName] = useState("");
  const [reason, setReason] = useState<CautionReason>("ALLERGY");
  const [memo, setMemo] = useState("");

  const create = async () => {
    if (!session || !targetName.trim()) {
      Alert.alert("입력 확인", "주의할 약 또는 성분명을 입력해 주세요.");
      return;
    }
    try {
      await api.createCaution(settings, session, {
        type,
        targetName: targetName.trim(),
        reason,
        memo,
      });
      setTargetName("");
      setMemo("");
      await reload();
    } catch (error) {
      Alert.alert("등록 실패", getErrorMessage(error));
    }
  };

  const remove = async (id: number) => {
    if (!session) return;
    try {
      await api.deleteCaution(settings, session, id);
      await reload();
    } catch (error) {
      Alert.alert("삭제 실패", getErrorMessage(error));
    }
  };

  return (
    <>
      <SectionTitle title="주의 약/성분" />
      <Card>
        <Segmented<CautionTargetType>
          value={type}
          onChange={setType}
          options={[
            { value: "MEDICINE", label: "약" },
            { value: "INGREDIENT", label: "성분" },
          ]}
        />
        <Field label="이름" value={targetName} onChangeText={setTargetName} />
        <Segmented<CautionReason> value={reason} onChange={setReason} options={cautionReasonOptions} />
        <Field label="메모" value={memo} onChangeText={setMemo} multiline />
        <AppButton title="등록" icon="add-circle-outline" onPress={create} />
      </Card>
      {loading ? <LoadingState /> : null}
      {(data ?? []).map((item) => (
        <ListRow
          key={item.id}
          icon="warning-outline"
          title={item.targetName}
          subtitle={`${item.type} · ${item.reason}${item.memo ? ` · ${item.memo}` : ""}`}
          right={<AppButton title="삭제" variant="ghost" onPress={() => void remove(item.id)} />}
        />
      ))}
    </>
  );
}

export function OcrScreen() {
  const { settings, session } = useAppContext();
  const cameraRef = useRef<any>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [result, setResult] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [cameraArea, setCameraArea] = useState({ width: 0, height: 0 });
  const [guideArea, setGuideArea] = useState({ x: 0, y: 0, width: 0, height: 0 });

  const guideFrameWidth = guideArea.width * 0.86;
  const guideFrameHeight = Math.min(guideFrameWidth / 0.74, guideArea.height * 0.82);
  const guideFrameLeft = (guideArea.width - guideFrameWidth) / 2;
  const guideFrameTop = (guideArea.height - guideFrameHeight) / 2;
  const hasGuideLayout = guideFrameWidth > 0 && guideFrameHeight > 0;
  const absoluteFrameLeft = guideArea.x + guideFrameLeft;
  const absoluteFrameTop = guideArea.y + guideFrameTop;

  const updateGuideArea = (event: LayoutChangeEvent) => {
    const { x, y, width, height } = event.nativeEvent.layout;
    setGuideArea({ x, y, width, height });
  };

  const openCamera = async () => {
    const permission = cameraPermission?.granted ? cameraPermission : await requestCameraPermission();
    if (!permission.granted) {
      Alert.alert("카메라 권한 필요", "처방전을 촬영하려면 카메라 접근 권한을 허용해 주세요.");
      return;
    }

    setCameraOpen(true);
  };

  const capturePrescription = async () => {
    if (!cameraRef.current || capturing) return;

    setCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.9 });
      if (!photo?.uri) return;

      if (!photo.width || !photo.height) {
        setImageUri(photo.uri);
        setResult("");
        setCameraOpen(false);
        return;
      }

      const cropWidth = Math.round(photo.width * 0.82);
      const cropHeight = Math.round(Math.min(cropWidth * 1.36, photo.height * 0.82));
      const originX = Math.max(0, Math.round((photo.width - cropWidth) / 2));
      const originY = Math.max(0, Math.round((photo.height - cropHeight) / 2));
      const cropped = await ImageManipulator.manipulateAsync(
        photo.uri,
        [{ crop: { originX, originY, width: cropWidth, height: cropHeight } }],
        { compress: 0.9, format: ImageManipulator.SaveFormat.JPEG }
      );

      setImageUri(cropped.uri);
      setResult("");
      setCameraOpen(false);
    } catch (error) {
      Alert.alert("촬영 실패", getErrorMessage(error));
    } finally {
      setCapturing(false);
    }
  };

  const pick = async () => {
    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsEditing: true,
      aspect: [3, 4],
    });

    if (!pickerResult.canceled) {
      setImageUri(pickerResult.assets[0]?.uri ?? null);
      setResult("");
    }
  };

  const run = async () => {
    if (!session || !imageUri) return;
    setLoading(true);
    try {
      const upload = await api.createPrescriptionUploadUrl(settings, session, {
        filename: `prescription-${Date.now()}.jpg`,
        contentType: "image/jpeg",
      });
      await api.uploadToPresignedUrl(upload.uploadUrl, imageUri, "image/jpeg", upload.headers);
      const ocr = await api.runPrescriptionOcr(settings, session, upload.ocrResultId);
      const names = ocr.medicines?.map((item) => item.medicineName).filter(Boolean).join(", ");
      setResult(ocr.extractedText || names || JSON.stringify(ocr, null, 2));
    } catch (error) {
      Alert.alert("OCR 실패", getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Hero title="처방전 등록" subtitle="웹 OCR 업로드 화면을 카메라/앨범 기반으로 옮겼습니다." />
      <Card>
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={{ width: "100%", height: 260, borderRadius: 8, backgroundColor: colors.bg }}
          />
        ) : (
          <EmptyState title="선택된 이미지가 없습니다." icon="image-outline" />
        )}
        <Toolbar>
          <AppButton title="앨범" icon="images-outline" variant="secondary" onPress={() => void pick()} />
          <AppButton title="카메라" icon="camera-outline" variant="secondary" onPress={() => void openCamera()} />
        </Toolbar>
        <AppButton
          title={loading ? "분석 중" : "OCR 실행"}
          icon="scan-outline"
          onPress={run}
          disabled={!imageUri || loading}
        />
      </Card>
      {result ? (
        <Card>
          <Text style={{ color: colors.text, fontWeight: "900", fontSize: 17 }}>분석 결과</Text>
          <Text style={{ color: colors.muted, lineHeight: 22 }}>{result}</Text>
        </Card>
      ) : null}
      <Modal visible={cameraOpen} animationType="slide" onRequestClose={() => setCameraOpen(false)}>
        <View style={{ flex: 1, backgroundColor: "#000" }}>
          <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back">
            <View
              onLayout={(event) => {
                const { width, height } = event.nativeEvent.layout;
                setCameraArea({ width, height });
              }}
              style={{
                flex: 1,
                paddingHorizontal: 24,
                paddingTop: 56,
                paddingBottom: 34,
                justifyContent: "space-between",
                position: "relative",
              }}
            >
              {hasGuideLayout ? (
                <>
                  <View
                    pointerEvents="none"
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 0,
                      width: cameraArea.width,
                      height: absoluteFrameTop,
                      backgroundColor: "rgba(31, 35, 40, 0.68)",
                      zIndex: 1,
                    }}
                  />
                  <View
                    pointerEvents="none"
                    style={{
                      position: "absolute",
                      left: 0,
                      top: absoluteFrameTop + guideFrameHeight,
                      width: cameraArea.width,
                      height: cameraArea.height - absoluteFrameTop - guideFrameHeight,
                      backgroundColor: "rgba(31, 35, 40, 0.68)",
                      zIndex: 1,
                    }}
                  />
                  <View
                    pointerEvents="none"
                    style={{
                      position: "absolute",
                      left: 0,
                      top: absoluteFrameTop,
                      width: absoluteFrameLeft,
                      height: guideFrameHeight,
                      backgroundColor: "rgba(31, 35, 40, 0.68)",
                      zIndex: 1,
                    }}
                  />
                  <View
                    pointerEvents="none"
                    style={{
                      position: "absolute",
                      left: absoluteFrameLeft + guideFrameWidth,
                      top: absoluteFrameTop,
                      width: cameraArea.width - absoluteFrameLeft - guideFrameWidth,
                      height: guideFrameHeight,
                      backgroundColor: "rgba(31, 35, 40, 0.68)",
                      zIndex: 1,
                    }}
                  />
                </>
              ) : null}
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", zIndex: 2 }}>
                <Pressable
                  onPress={() => setCameraOpen(false)}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: "rgba(0,0,0,0.45)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="close" size={28} color="#fff" />
                </Pressable>
                <Text style={{ color: "#fff", fontSize: 17, fontWeight: "900" }}>처방전 촬영</Text>
                <View style={{ width: 44 }} />
              </View>

              <View
                onLayout={updateGuideArea}
                style={{ alignItems: "center", justifyContent: "center", flex: 1, position: "relative", zIndex: 2 }}
              >
                <View
                  style={{
                    position: "absolute",
                    left: guideFrameLeft,
                    top: guideFrameTop,
                    width: guideFrameWidth,
                    height: guideFrameHeight,
                    borderWidth: 3,
                    borderColor: "#FFFFFF",
                    borderRadius: 14,
                    backgroundColor: "transparent",
                    zIndex: 2,
                  }}
                >
                  <View
                    style={{
                      position: "absolute",
                      left: -3,
                      top: -3,
                      width: 42,
                      height: 42,
                      borderLeftWidth: 7,
                      borderTopWidth: 7,
                      borderColor: colors.primary,
                      borderTopLeftRadius: 14,
                    }}
                  />
                  <View
                    style={{
                      position: "absolute",
                      right: -3,
                      top: -3,
                      width: 42,
                      height: 42,
                      borderRightWidth: 7,
                      borderTopWidth: 7,
                      borderColor: colors.primary,
                      borderTopRightRadius: 14,
                    }}
                  />
                  <View
                    style={{
                      position: "absolute",
                      left: -3,
                      bottom: -3,
                      width: 42,
                      height: 42,
                      borderLeftWidth: 7,
                      borderBottomWidth: 7,
                      borderColor: colors.primary,
                      borderBottomLeftRadius: 14,
                    }}
                  />
                  <View
                    style={{
                      position: "absolute",
                      right: -3,
                      bottom: -3,
                      width: 42,
                      height: 42,
                      borderRightWidth: 7,
                      borderBottomWidth: 7,
                      borderColor: colors.primary,
                      borderBottomRightRadius: 14,
                    }}
                  />
                </View>
                <Text
                  style={{
                    position: "absolute",
                    top: guideFrameTop + guideFrameHeight + 18,
                    color: "#fff",
                    fontWeight: "800",
                    zIndex: 2,
                  }}
                >
                  처방전을 프레임 안에 맞춰 촬영하세요
                </Text>
              </View>

              <View style={{ alignItems: "center", zIndex: 2 }}>
                <Pressable
                  onPress={() => void capturePrescription()}
                  disabled={capturing}
                  style={{
                    width: 78,
                    height: 78,
                    borderRadius: 39,
                    borderWidth: 5,
                    borderColor: "#fff",
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: capturing ? 0.7 : 1,
                  }}
                >
                  <View
                    style={{
                      width: 58,
                      height: 58,
                      borderRadius: 29,
                      backgroundColor: "#fff",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {capturing ? <ActivityIndicator color={colors.primary} /> : null}
                  </View>
                </Pressable>
              </View>
            </View>
          </CameraView>
        </View>
      </Modal>
    </Screen>
  );
}
