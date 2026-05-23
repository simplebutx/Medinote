import { useRef, useState } from "react";
import { Text, View } from "react-native";

import { api } from "../api/client";
import { useAppContext } from "../context/AppContext";
import { Button, Field, InfoBanner, Screen, SectionCard } from "../ui";

interface ChatItem {
  role: "user" | "assistant";
  text: string;
}

export function ChatScreen() {
  const { settings } = useAppContext();
  const [message, setMessage] = useState("");
  const [history, setHistory] = useState<ChatItem[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMessageChange = (value: string) => {
    setMessage(value);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    const mentionMatch = value.match(/@([^\s@]*)$/);

    if (!mentionMatch?.[1]) {
      setSuggestions([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const items = await api.suggestMedicines(settings, mentionMatch[1]);
        setSuggestions(items);
      } catch {
        setSuggestions([]);
      }
    }, 220);
  };

  const handleSend = async () => {
    if (!message.trim()) {
      return;
    }

    const userText = message.trim();
    setLoading(true);
    setSuggestions([]);
    setMessage("");
    setHistory((prev) => [...prev, { role: "user", text: userText }]);

    try {
      const response = await api.sendChatMessage(settings, userText);
      setHistory((prev) => [...prev, { role: "assistant", text: response.answer || "답변이 비어 있습니다." }]);
    } catch (error: any) {
      setHistory((prev) => [...prev, { role: "assistant", text: error?.response?.data?.message || "챗봇 요청에 실패했습니다." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <SectionCard title="챗봇 & 상담" subtitle="`@약이름` 형식의 멘션 자동완성을 유지했고, 답변은 대화형 카드로 쌓이게 만들었습니다.">
        <Field label="질문" value={message} onChangeText={handleMessageChange} multiline placeholder="@타이레놀 먹는 법 알려줘" />
        {suggestions.map((suggestion) => (
          <Button
            key={suggestion}
            title={`멘션 넣기: @${suggestion}`}
            onPress={() => {
              setMessage((prev) => prev.replace(/@([^\s@]*)$/, `@${suggestion} `));
              setSuggestions([]);
            }}
            secondary
          />
        ))}
        <Button title="보내기" onPress={handleSend} loading={loading} />
        {!history.length ? <InfoBanner text="아직 대화가 없습니다. 약 이름을 @로 멘션하면 기존 자동완성 API를 그대로 사용합니다." /> : null}
      </SectionCard>

      {history.map((item, index) => (
        <SectionCard
          key={`${item.role}-${index}`}
          title={item.role === "user" ? "내 질문" : "챗봇 답변"}
          subtitle={item.role === "user" ? "USER" : "ASSISTANT"}
        >
          <Text style={{ color: "#335c52", lineHeight: 24 }}>{item.text}</Text>
        </SectionCard>
      ))}
    </Screen>
  );
}
