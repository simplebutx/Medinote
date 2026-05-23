import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { api } from "../api/client";
import { useAppContext } from "../context/AppContext";
import { Button, Field, InfoBanner, PillSelector, Screen, SectionCard } from "../ui";

const healthOptions = [
  { key: "isPregnant", label: "임산부" },
  { key: "isBreastfeeding", label: "수유 중" },
  { key: "isSmoking", label: "흡연" },
  { key: "isDrinking", label: "음주" },
] as const;

export function SignupScreen({ navigation }: any) {
  const { settings } = useAppContext();
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState<"MALE" | "FEMALE">("MALE");
  const [verificationCode, setVerificationCode] = useState("");
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [stepOneLoading, setStepOneLoading] = useState(false);
  const [stepTwoLoading, setStepTwoLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [healthState, setHealthState] = useState({
    isPregnant: false,
    isBreastfeeding: false,
    isSmoking: false,
    isDrinking: false,
  });
  const [diseaseInput, setDiseaseInput] = useState("");
  const [diseaseNames, setDiseaseNames] = useState<string[]>([]);
  const [diseaseSuggestions, setDiseaseSuggestions] = useState<string[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timeLeft <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const countdownText = useMemo(() => {
    const min = String(Math.floor(timeLeft / 60)).padStart(2, "0");
    const sec = String(timeLeft % 60).padStart(2, "0");
    return `${min}:${sec}`;
  }, [timeLeft]);

  const handleSendCode = async () => {
    if (!email.trim()) {
      setMessage("이메일을 먼저 입력해 주세요.");
      return;
    }

    try {
      await api.sendVerificationCode(settings, email.trim());
      setIsCodeSent(true);
      setTimeLeft(180);
      setMessage("인증번호를 보냈습니다.");
    } catch (error: any) {
      setMessage(error?.response?.data?.message || "인증번호 발송에 실패했습니다.");
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode.trim()) {
      setMessage("인증번호를 입력해 주세요.");
      return;
    }

    try {
      const response = await api.verifyEmailCode(settings, email.trim(), verificationCode.trim());
      setIsEmailVerified(response.verified);
      setMessage(response.message || (response.verified ? "이메일 인증 완료" : "인증에 실패했습니다."));
      if (response.verified) {
        setTimeLeft(0);
      }
    } catch (error: any) {
      setMessage(error?.response?.data?.message || "인증 확인에 실패했습니다.");
    }
  };

  const handleNext = async () => {
    if (!isEmailVerified) {
      setMessage("이메일 인증을 완료해야 다음 단계로 이동할 수 있습니다.");
      return;
    }

    setStepOneLoading(true);
    setMessage("");

    try {
      await api.signupBasic(settings, {
        email: email.trim(),
        password,
        username: username.trim(),
        birthDate,
        gender,
        role: "USER",
      });
      setStep(2);
    } catch (error: any) {
      setMessage(error?.response?.data?.message || "기본 정보 저장에 실패했습니다.");
    } finally {
      setStepOneLoading(false);
    }
  };

  const handleDiseaseChange = (value: string) => {
    setDiseaseInput(value);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    const keyword = value.trim().replace(/^@/, "");

    if (!keyword) {
      setDiseaseSuggestions([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const items = await api.suggestDiseases(settings, keyword);
        setDiseaseSuggestions(items.filter((item) => !diseaseNames.includes(item)));
      } catch {
        setDiseaseSuggestions([]);
      }
    }, 220);
  };

  const addDisease = (value: string) => {
    const next = value.trim().replace(/^@/, "");

    if (!next || diseaseNames.includes(next)) {
      setDiseaseInput("");
      setDiseaseSuggestions([]);
      return;
    }

    setDiseaseNames((prev) => [...prev, next]);
    setDiseaseInput("");
    setDiseaseSuggestions([]);
  };

  const handleCompleteSignup = async () => {
    setStepTwoLoading(true);
    setMessage("");

    try {
      await api.submitUserProfile(settings, {
        email: email.trim(),
        ...healthState,
        diseaseNames,
      });
      setMessage("회원가입이 완료되었습니다. 로그인 화면으로 돌아갑니다.");
      setTimeout(() => navigation.goBack(), 800);
    } catch (error: any) {
      setMessage(error?.response?.data?.message || "추가 정보 저장에 실패했습니다.");
    } finally {
      setStepTwoLoading(false);
    }
  };

  return (
    <Screen>
      {step === 1 ? (
        <SectionCard
          title="회원가입 1단계"
          subtitle="현재 모바일 버전은 일반 사용자(USER) 흐름에 맞춰 구성했습니다."
        >
          <Field label="이메일" value={email} onChangeText={setEmail} keyboardType="email-address" />
          <Button title={isCodeSent ? "인증번호 다시 보내기" : "인증번호 보내기"} onPress={handleSendCode} secondary />
          {isCodeSent ? (
            <>
              <Field label="인증번호" value={verificationCode} onChangeText={setVerificationCode} />
              <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
                <View style={{ flex: 1 }}>
                  <Button title="인증 확인" onPress={handleVerifyCode} secondary />
                </View>
                <Text style={{ color: "#0f766e", fontWeight: "700" }}>{timeLeft > 0 ? countdownText : ""}</Text>
              </View>
            </>
          ) : null}
          <Field label="비밀번호" value={password} onChangeText={setPassword} secureTextEntry />
          <Field label="이름" value={username} onChangeText={setUsername} />
          <Field label="생년월일" value={birthDate} onChangeText={setBirthDate} placeholder="YYYY-MM-DD" />
          <View style={{ gap: 8 }}>
            <Text style={{ color: "#35574e", fontWeight: "700" }}>성별</Text>
            <PillSelector
              options={[
                { value: "MALE", label: "남성" },
                { value: "FEMALE", label: "여성" },
              ]}
              value={gender}
              onChange={(value) => setGender(value as "MALE" | "FEMALE")}
            />
          </View>
          {message ? <InfoBanner text={message} tone={message.includes("실패") ? "danger" : "default"} /> : null}
          <Button title="다음 단계" onPress={handleNext} loading={stepOneLoading} />
        </SectionCard>
      ) : (
        <SectionCard
          title="회원가입 2단계"
          subtitle="건강 정보와 기저질환은 추후 복약 일정, 주의 성분, 상담 흐름에 연결됩니다."
        >
          <Text style={{ color: "#35574e", fontWeight: "700", fontSize: 16 }}>건강 상태</Text>
          <PillSelector
            options={healthOptions.map((option) => ({
              value: option.key,
              label: `${healthState[option.key] ? "선택됨" : "미선택"} · ${option.label}`,
            }))}
            value="__multiple__"
            onChange={() => {}}
          />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {healthOptions.map((option) => (
              <Pressable
                key={option.key}
                onPress={() =>
                  setHealthState((prev) => ({
                    ...prev,
                    [option.key]: !prev[option.key],
                  }))
                }
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: healthState[option.key] ? "#0f766e" : "#cde0da",
                  backgroundColor: healthState[option.key] ? "#0f766e" : "#ffffff",
                }}
              >
                <Text style={{ color: healthState[option.key] ? "#ffffff" : "#35574e", fontWeight: "700" }}>
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Field
            label="기저질환"
            value={diseaseInput}
            onChangeText={handleDiseaseChange}
            placeholder="@당뇨, 고혈압처럼 입력"
          />
          {diseaseSuggestions.map((suggestion) => (
            <Button key={suggestion} title={`추가: ${suggestion}`} onPress={() => addDisease(suggestion)} secondary />
          ))}
          {diseaseInput.trim() ? <Button title={`직접 추가: ${diseaseInput.trim()}`} onPress={() => addDisease(diseaseInput)} secondary /> : null}

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {diseaseNames.map((disease) => (
              <Pressable
                key={disease}
                onPress={() => setDiseaseNames((prev) => prev.filter((item) => item !== disease))}
                style={{
                  backgroundColor: "#edf7f5",
                  borderRadius: 999,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderWidth: 1,
                  borderColor: "#cde0da",
                }}
              >
                <Text style={{ color: "#0f766e", fontWeight: "700" }}>#{disease} 삭제</Text>
              </Pressable>
            ))}
          </View>

          {message ? <InfoBanner text={message} tone={message.includes("실패") ? "danger" : "default"} /> : null}
          <Button title="회원가입 완료" onPress={handleCompleteSignup} loading={stepTwoLoading} />
        </SectionCard>
      )}
    </Screen>
  );
}
