import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { Alert, Image, Text, View } from "react-native";

import { api, getErrorMessage } from "../api/client";
import {
  AppButton,
  Card,
  Field,
  Hero,
  Screen,
  Segmented,
  ToggleRow,
} from "../components/ui";
import { brand, colors } from "../constants";
import { useAppContext } from "../context/AppContext";
import type { Gender, UserRole } from "../types";

export function LandingScreen({ navigation }: { navigation: any }) {
  return (
    <Screen>
      <Hero title={brand.name} subtitle={brand.tagline}>
        <View style={{ height: 10 }} />
        <AppButton title="로그인" icon="log-in-outline" onPress={() => navigation.navigate("Login")} />
        <AppButton
          title="회원가입"
          icon="person-add-outline"
          variant="secondary"
          onPress={() => navigation.navigate("Signup")}
        />
      </Hero>

      <Card>
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: "800" }}>
          웹 프론트의 주요 화면을 모바일로 옮겼습니다
        </Text>
        <Text style={{ color: colors.muted, lineHeight: 22 }}>
          복약 일정, 처방전 OCR, 약 검색, 챗봇 상담, 약국 조회, 알림, 마이페이지,
          약사/관리자 화면을 역할별 탭으로 사용할 수 있습니다.
        </Text>
      </Card>

      <Card>
        <Text style={{ color: colors.text, fontWeight: "800" }}>백엔드 연결 주소</Text>
        <Text style={{ color: colors.muted, lineHeight: 21 }}>
          Expo 실행 전 `.env.local` 또는 Expo 환경변수에 각 API 주소를 넣으면 그대로
          연결됩니다. 기본값은 localhost의 auth 8080, medication 8081,
          consultation 8082입니다.
        </Text>
      </Card>
    </Screen>
  );
}

export function LoginScreen() {
  const { settings, saveSession } = useAppContext();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email || !password) {
      Alert.alert("입력 확인", "이메일과 비밀번호를 입력해 주세요.");
      return;
    }

    setLoading(true);
    try {
      const response = await api.login(settings, email.trim(), password);
      await saveSession({
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        role: response.role,
        userId: response.userId,
        status: response.status ?? null,
      });
    } catch (error) {
      Alert.alert("로그인 실패", getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Hero title="로그인" subtitle="웹과 같은 계정으로 모바일 앱에 접속합니다." />
      <Card>
        <Field label="이메일" value={email} onChangeText={setEmail} keyboardType="email-address" />
        <Field
          label="비밀번호"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <AppButton
          title={loading ? "로그인 중" : "로그인"}
          icon="log-in-outline"
          onPress={submit}
          disabled={loading}
        />
      </Card>
    </Screen>
  );
}

export function SignupScreen({ navigation }: { navigation: any }) {
  const { settings, session } = useAppContext();
  const [role, setRole] = useState<UserRole>("USER");
  const [gender, setGender] = useState<Gender>("MALE");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [code, setCode] = useState("");
  const [verified, setVerified] = useState(false);
  const [isPregnant, setPregnant] = useState(false);
  const [isBreastfeeding, setBreastfeeding] = useState(false);
  const [isSmoking, setSmoking] = useState(false);
  const [isDrinking, setDrinking] = useState(false);
  const [diseases, setDiseases] = useState("");
  const [docNumber, setDocNumber] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [licenseImageUri, setLicenseImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const sendEmail = async () => {
    if (!email) {
      Alert.alert("이메일 확인", "인증 코드를 받을 이메일을 입력해 주세요.");
      return;
    }
    try {
      await api.sendEmailCode(settings, email.trim());
      Alert.alert("전송 완료", "인증 코드가 전송되었습니다.");
    } catch (error) {
      Alert.alert("전송 실패", getErrorMessage(error));
    }
  };

  const verifyEmail = async () => {
    try {
      const result = await api.verifyEmailCode(settings, email.trim(), code.trim());
      setVerified(Boolean(result.verified));
      Alert.alert(result.verified ? "인증 완료" : "인증 실패", result.message);
    } catch (error) {
      Alert.alert("인증 실패", getErrorMessage(error));
    }
  };

  const pickLicense = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });

    if (!result.canceled) {
      setLicenseImageUri(result.assets[0]?.uri ?? null);
    }
  };

  const submit = async () => {
    if (!email || !password || !username || !birthDate) {
      Alert.alert("입력 확인", "필수 정보를 모두 입력해 주세요.");
      return;
    }

    setLoading(true);
    try {
      await api.signup(settings, {
        email: email.trim(),
        password,
        username,
        birthDate,
        gender,
        role,
      });

      if (role === "USER") {
        await api.submitUserAdditionalInfo(settings, session, {
          email: email.trim(),
          isPregnant,
          isBreastfeeding,
          isSmoking,
          isDrinking,
          diseaseNames: diseases
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
        });
      }

      if (role === "PHARMACIST" && (docNumber || licenseNumber || licenseImageUri)) {
        await api.requestPharmacistVerification(settings, session, {
          email: email.trim(),
          docNumber,
          licenseNumber,
          licenseImageUri,
        });
      }

      Alert.alert("가입 완료", "로그인 후 이용해 주세요.");
      navigation.navigate("Login");
    } catch (error) {
      Alert.alert("가입 실패", getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Hero title="회원가입" subtitle="웹 회원가입 흐름을 모바일 입력 폼으로 옮겼습니다." />
      <Card>
        <Segmented<UserRole>
          value={role}
          onChange={setRole}
          options={[
            { value: "USER", label: "사용자" },
            { value: "PHARMACIST", label: "약사" },
          ]}
        />
        <Field label="이메일" value={email} onChangeText={setEmail} keyboardType="email-address" />
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Field label="인증 코드" value={code} onChangeText={setCode} />
          </View>
          <View style={{ width: 104, gap: 8, justifyContent: "flex-end" }}>
            <AppButton title="전송" variant="ghost" onPress={sendEmail} />
            <AppButton title={verified ? "완료" : "확인"} variant="secondary" onPress={verifyEmail} />
          </View>
        </View>
        <Field label="비밀번호" value={password} onChangeText={setPassword} secureTextEntry />
        <Field label="이름" value={username} onChangeText={setUsername} />
        <Field
          label="생년월일"
          value={birthDate}
          onChangeText={setBirthDate}
          placeholder="YYYY-MM-DD"
        />
        <Segmented<Gender>
          value={gender}
          onChange={setGender}
          options={[
            { value: "MALE", label: "남성" },
            { value: "FEMALE", label: "여성" },
          ]}
        />
      </Card>

      {role === "USER" ? (
        <Card>
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: "800" }}>
            건강 정보
          </Text>
          <ToggleRow label="임신 중" value={isPregnant} onToggle={() => setPregnant((v) => !v)} />
          <ToggleRow
            label="수유 중"
            value={isBreastfeeding}
            onToggle={() => setBreastfeeding((v) => !v)}
          />
          <ToggleRow label="흡연" value={isSmoking} onToggle={() => setSmoking((v) => !v)} />
          <ToggleRow label="음주" value={isDrinking} onToggle={() => setDrinking((v) => !v)} />
          <Field
            label="만성질환"
            value={diseases}
            onChangeText={setDiseases}
            placeholder="고혈압, 당뇨처럼 쉼표로 구분"
          />
        </Card>
      ) : (
        <Card>
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: "800" }}>
            약사 인증 정보
          </Text>
          <Field label="소속 약국 번호" value={docNumber} onChangeText={setDocNumber} />
          <Field label="면허 번호" value={licenseNumber} onChangeText={setLicenseNumber} />
          {licenseImageUri ? (
            <Image
              source={{ uri: licenseImageUri }}
              style={{ width: "100%", height: 160, borderRadius: 8, backgroundColor: colors.bg }}
            />
          ) : null}
          <AppButton
            title="면허 이미지 선택"
            icon="image-outline"
            variant="secondary"
            onPress={pickLicense}
          />
        </Card>
      )}

      <AppButton
        title={loading ? "가입 처리 중" : "가입하기"}
        icon="person-add-outline"
        onPress={submit}
        disabled={loading}
      />
    </Screen>
  );
}
