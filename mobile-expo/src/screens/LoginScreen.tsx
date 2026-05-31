import { useState } from "react";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { api } from "../api/client";
import { useAppContext } from "../context/AppContext";
import { Button, Field, InfoBanner, Screen, SectionCard } from "../ui";

export function LoginScreen({ navigation }: NativeStackScreenProps<any>) {
  const { saveSession, settings } = useAppContext();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setMessage("이메일과 비밀번호를 모두 입력해 주세요.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await api.login(settings, email.trim(), password);
      await saveSession(response);
      setMessage("로그인되었습니다.");
    } catch (error: any) {
      const serverMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.response?.data?.code ||
        error?.message;

      setMessage(
        serverMessage
          ? `로그인에 실패했습니다. ${serverMessage}`
          : "로그인에 실패했습니다. 이메일과 비밀번호를 확인해 주세요."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <SectionCard
        title="MyMedi Mobile"
        subtitle="모바일 앱에서 바로 로그인하거나 회원가입을 진행할 수 있어요."
      >
        <Field
          label="이메일"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          placeholder="example@email.com"
        />
        <Field
          label="비밀번호"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="비밀번호"
        />
        {message ? (
          <InfoBanner text={message} tone={message.includes("실패") ? "danger" : "success"} />
        ) : null}
        <Button title="로그인" onPress={handleLogin} loading={loading} />
        <Button title="회원가입으로 이동" onPress={() => navigation.navigate("Signup")} secondary />
      </SectionCard>
    </Screen>
  );
}
