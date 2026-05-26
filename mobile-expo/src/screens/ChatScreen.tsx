import { useRef, useState } from "react";
import { Text, View } from "react-native";

import { api } from "../api/client";
import { useAppContext } from "../context/AppContext";
import { Button, Field, InfoBanner, Screen, SectionCard, SuggestionButton } from "../ui";

interface ChatItem {
  role: "user" | "assistant";
  text: string;
}

const emptyChatHint =
  "약 이름을 @로 입력하면 자동완성이 뜨고, 질문과 답변이 하나의 대화방처럼 이어집니다.";

export function ChatScreen() {
  const { settings, session } = useAppContext();
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
      const response = await api.sendChatMessage(settings, session, userText);
      setHistory((prev) => [
        ...prev,
        { role: "assistant", text: response.answer || "답변이 비어 있습니다." },
      ]);
    } catch (error: any) {
      setHistory((prev) => [
        ...prev,
        { role: "assistant", text: error?.response?.data?.message || "챗봇 요청에 실패했습니다." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <SectionCard
        title="챗봇 상담"
        subtitle="질문과 답변이 하나의 채팅방처럼 이어집니다. 약 이름은 @로 입력하면 자동완성을 사용할 수 있어요."
      >
        <View
          style={{
            backgroundColor: "#f5faf8",
            borderRadius: 22,
            padding: 12,
            gap: 10,
            minHeight: 280,
            borderWidth: 1,
            borderColor: "#dbe9e4",
          }}
        >
          {!history.length ? (
            <View
              style={{
                flex: 1,
                minHeight: 240,
                alignItems: "center",
                justifyContent: "center",
                paddingHorizontal: 18,
              }}
            >
              <Text style={{ color: "#6a847c", lineHeight: 22, textAlign: "center" }}>
                {emptyChatHint}
              </Text>
            </View>
          ) : (
            history.map((item, index) => (
              <View
                key={`${item.role}-${index}`}
                style={{
                  alignSelf: item.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: "84%",
                  gap: 6,
                }}
              >
                <Text
                  style={{
                    color: "#6a847c",
                    fontSize: 12,
                    fontWeight: "700",
                    textAlign: item.role === "user" ? "right" : "left",
                  }}
                >
                  {item.role === "user" ? "나" : "챗봇"}
                </Text>
                <View
                  style={{
                    backgroundColor: item.role === "user" ? "#0f766e" : "#ffffff",
                    borderRadius: 18,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    borderWidth: item.role === "user" ? 0 : 1,
                    borderColor: "#d7e5e0",
                  }}
                >
                  <Text
                    style={{
                      color: item.role === "user" ? "#ffffff" : "#23443c",
                      lineHeight: 22,
                    }}
                  >
                    {item.text}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>

        <View
          style={{
            backgroundColor: "#ffffff",
            borderRadius: 22,
            borderWidth: 1,
            borderColor: "#d7e5e0",
            padding: 12,
            gap: 10,
          }}
        >
          <Field
            label="질문 입력"
            value={message}
            onChangeText={handleMessageChange}
            multiline
            placeholder="@타이레놀 먹는 법 알려줘"
          />

          {suggestions.map((suggestion) => (
            <SuggestionButton
              key={suggestion}
              title={`@${suggestion}`}
              onPress={() => {
                setMessage((prev) => prev.replace(/@([^\s@]*)$/, `@${suggestion} `));
                setSuggestions([]);
              }}
            />
          ))}

          <Button title="보내기" onPress={handleSend} loading={loading} />
        </View>

        {!history.length ? <InfoBanner text={emptyChatHint} /> : null}
      </SectionCard>
    </Screen>
  );
}
