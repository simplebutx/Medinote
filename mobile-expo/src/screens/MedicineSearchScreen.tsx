import { useRef, useState } from "react";
import { Image, Keyboard, Pressable, Text, View } from "react-native";

import { api } from "../api/client";
import { useAppContext } from "../context/AppContext";
import type { MedicineSearchResponse } from "../types";
import { trimText } from "../utils";
import { Field, InfoBanner, Screen, SectionCard, SuggestionButton } from "../ui";

const defaultMessage = "약 이름이나 성분명을 입력하면 이미지와 주요 복약 정보를 바로 확인할 수 있어요.";

export function MedicineSearchScreen() {
  const { settings } = useAppContext();
  const [keyword, setKeyword] = useState("");
  const [message, setMessage] = useState(defaultMessage);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [results, setResults] = useState<MedicineSearchResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSearch = () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    setKeyword("");
    setSuggestions([]);
    setResults([]);
    setLoading(false);
    setMessage(defaultMessage);
  };

  const handleKeywordChange = (value: string) => {
    setKeyword(value);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    const trimmed = value.trim();

    if (!trimmed) {
      setSuggestions([]);
      setResults([]);
      setMessage(defaultMessage);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const items = await api.suggestMedicines(settings, trimmed);
        setSuggestions(items);
      } catch {
        setSuggestions([]);
      }
    }, 220);
  };

  const runSearch = async (nextKeyword?: string) => {
    const searchWord = (nextKeyword ?? keyword).trim();

    if (!searchWord) {
      setMessage("검색어를 입력해 주세요.");
      setResults([]);
      return;
    }

    setLoading(true);
    setSuggestions([]);
    setMessage("");

    try {
      const items = await api.searchMedicines(settings, searchWord);
      setResults(items);
      setMessage(items.length ? "" : "검색 결과가 없습니다.");
    } catch (error: any) {
      setMessage(error?.response?.data?.message || "약 검색에 실패했습니다.");
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <SectionCard title="약 검색" subtitle="웹 테스트 페이지에서 만들었던 자동완성과 상세 결과 카드를 모바일에 맞게 옮겼습니다.">
        <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-end" }}>
          <View style={{ flex: 1 }}>
            <Field
              label="검색어"
              value={keyword}
              onChangeText={handleKeywordChange}
              placeholder="타이레놀, 아세트아미노펜"
            />
          </View>
          {(keyword || results.length > 0 || suggestions.length > 0) ? (
            <Pressable
              onPress={clearSearch}
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#ffffff",
                borderWidth: 1,
                borderColor: "#cfe0da",
                marginBottom: 1,
              }}
            >
              <Text style={{ fontSize: 18, fontWeight: "800", color: "#35574e" }}>X</Text>
            </Pressable>
          ) : null}
        </View>

        {suggestions.map((suggestion) => (
          <SuggestionButton
            key={suggestion}
            title={suggestion}
            onPress={() => {
              Keyboard.dismiss();
              setKeyword(suggestion);
              runSearch(suggestion);
            }}
          />
        ))}
        {message ? <InfoBanner text={message} /> : null}
      </SectionCard>

      {results.map((medicine) => (
        <SectionCard
          key={medicine.itemSeq}
          title={medicine.itemName}
          subtitle={`#${medicine.itemSeq} · ${trimText(medicine.companyName)}`}
        >
          {medicine.imageUrl ? (
            <Image
              source={{ uri: medicine.imageUrl }}
              style={{ width: "100%", height: 180, borderRadius: 18, backgroundColor: "#eef4f2" }}
              resizeMode="contain"
            />
          ) : null}
          <View style={{ gap: 10 }}>
            <Text style={{ color: "#10332b", fontWeight: "700" }}>효능</Text>
            <Text style={{ color: "#547066", lineHeight: 22 }}>{trimText(medicine.efficacy)}</Text>
            <Text style={{ color: "#10332b", fontWeight: "700" }}>복용법</Text>
            <Text style={{ color: "#547066", lineHeight: 22 }}>{trimText(medicine.useMethod)}</Text>
            <Text style={{ color: "#10332b", fontWeight: "700" }}>주의사항</Text>
            <Text style={{ color: "#547066", lineHeight: 22 }}>{trimText(medicine.caution)}</Text>
            <Text style={{ color: "#10332b", fontWeight: "700" }}>부작용</Text>
            <Text style={{ color: "#547066", lineHeight: 22 }}>{trimText(medicine.sideEffect)}</Text>
          </View>
        </SectionCard>
      ))}
    </Screen>
  );
}
