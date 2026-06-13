import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useMemo, useState } from "react";
import { Alert, Image, Text, View } from "react-native";

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

  return (
    <Screen>
      <Hero title="알림" subtitle="복약 알림과 상담 알림을 한 화면에서 확인합니다." />
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
      setItems(result);
    } catch (error) {
      Alert.alert("약국 조회 실패", getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Hero
        title="근처 약국"
        subtitle="웹 지도 화면은 모바일에서 좌표 범위 기반 목록으로 옮겼습니다."
      />
      <Card>
        <Field label="보유 약 검색어" value={keyword} onChangeText={setKeyword} placeholder="약 이름" />
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Field label="남쪽 위도" value={southLat} onChangeText={setSouthLat} keyboardType="numeric" />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="북쪽 위도" value={northLat} onChangeText={setNorthLat} keyboardType="numeric" />
          </View>
        </View>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Field label="서쪽 경도" value={westLng} onChangeText={setWestLng} keyboardType="numeric" />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="동쪽 경도" value={eastLng} onChangeText={setEastLng} keyboardType="numeric" />
          </View>
        </View>
        <Toolbar>
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
      {items.map((item) => (
        <Card key={item.hpid}>
          <Text style={{ color: colors.text, fontSize: 17, fontWeight: "900" }}>
            {item.name || item.pharmacyName || item.hpid}
          </Text>
          <KeyValue label="주소" value={item.address} />
          <KeyValue label="전화" value={item.phone} />
          <KeyValue label="좌표" value={`${item.latitude ?? "-"}, ${item.longitude ?? "-"}`} />
          <KeyValue label="운영 정보" value={`월 ${item.mondayOpen ?? "-"} - ${item.mondayClose ?? "-"}`} />
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
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [result, setResult] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const pick = async (camera = false) => {
    const pickerResult = camera
      ? await ImagePicker.launchCameraAsync({ quality: 0.85 })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.85,
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
          <AppButton title="앨범" icon="images-outline" variant="secondary" onPress={() => void pick(false)} />
          <AppButton title="카메라" icon="camera-outline" variant="secondary" onPress={() => void pick(true)} />
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
    </Screen>
  );
}
