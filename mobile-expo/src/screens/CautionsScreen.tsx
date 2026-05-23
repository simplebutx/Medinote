import { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { api } from "../api/client";
import { reasonOptions } from "../constants";
import { useAppContext } from "../context/AppContext";
import type { CautionReason, CautionType, UserMedicationCautionResponse } from "../types";
import { Button, Field, InfoBanner, PillSelector, Screen, SectionCard } from "../ui";

export function CautionsScreen() {
  const { settings, session } = useAppContext();
  const [selectedType, setSelectedType] = useState<CautionType>("MEDICINE");
  const [keyword, setKeyword] = useState("");
  const [selectedSuggestion, setSelectedSuggestion] = useState<{ name: string; type: CautionType } | null>(null);
  const [suggestions, setSuggestions] = useState<Array<{ name: string; type: CautionType }>>([]);
  const [reason, setReason] = useState<CautionReason>("ALLERGY");
  const [memo, setMemo] = useState("");
  const [items, setItems] = useState<UserMedicationCautionResponse[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadItems = async () => {
    if (!session) return;

    try {
      const response = await api.getCautions(settings, session);
      setItems(response);
    } catch (error: any) {
      setMessage(error?.response?.data?.message || "주의 약 목록을 불러오지 못했습니다.");
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  const handleKeywordChange = (value: string) => {
    setKeyword(value);
    setSelectedSuggestion(null);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    const trimmed = value.trim();

    if (!trimmed || !session) {
      setSuggestions([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const response = await api.suggestCautions(settings, session, trimmed, selectedType);
        setSuggestions(response);
      } catch {
        setSuggestions([]);
      }
    }, 220);
  };

  const resetForm = () => {
    setKeyword("");
    setSelectedSuggestion(null);
    setSuggestions([]);
    setReason("ALLERGY");
    setMemo("");
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!session) return;

    if (!selectedSuggestion) {
      setMessage("자동완성 목록에서 먼저 약 또는 성분을 선택해 주세요.");
      return;
    }

    const payload = {
      itemSeq: null,
      itemName: selectedSuggestion.type === "MEDICINE" ? selectedSuggestion.name : null,
      ingredientCode: null,
      ingredientName: selectedSuggestion.type === "INGREDIENT" ? selectedSuggestion.name : null,
      reason,
      memo: memo.trim() || null,
    };

    setLoading(true);
    setMessage("");

    try {
      if (editingId) {
        await api.updateCaution(settings, session, editingId, payload);
        setMessage("주의 약/성분을 수정했습니다.");
      } else {
        await api.createCaution(settings, session, payload);
        setMessage("주의 약/성분을 등록했습니다.");
      }
      resetForm();
      await loadItems();
    } catch (error: any) {
      setMessage(error?.response?.data?.message || "저장에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!session) return;

    try {
      await api.deleteCaution(settings, session, id);
      setMessage("삭제했습니다.");
      await loadItems();
    } catch (error: any) {
      setMessage(error?.response?.data?.message || "삭제에 실패했습니다.");
    }
  };

  return (
    <Screen>
      <SectionCard title="주의 약/성분 등록" subtitle="약으로 등록할지 성분으로 등록할지 선택하고 자동완성에서 고른 뒤 이유와 메모를 남길 수 있습니다.">
        <PillSelector
          options={[
            { value: "MEDICINE", label: "약" },
            { value: "INGREDIENT", label: "성분" },
          ]}
          value={selectedType}
          onChange={(value) => setSelectedType(value as CautionType)}
        />
        <Field
          label={selectedType === "MEDICINE" ? "약 검색" : "성분 검색"}
          value={keyword}
          onChangeText={handleKeywordChange}
          placeholder={selectedType === "MEDICINE" ? "타이레놀" : "아세트아미노펜"}
        />
        {suggestions.map((suggestion) => (
          <Button
            key={`${suggestion.type}-${suggestion.name}`}
            title={`${suggestion.type === "MEDICINE" ? "약" : "성분"} · ${suggestion.name}`}
            onPress={() => {
              setSelectedSuggestion(suggestion);
              setKeyword(suggestion.name);
              setSuggestions([]);
            }}
            secondary
          />
        ))}
        <Text style={{ color: "#547066" }}>
          현재 선택: {selectedSuggestion ? `${selectedSuggestion.type} / ${selectedSuggestion.name}` : "없음"}
        </Text>
        <PillSelector options={reasonOptions} value={reason} onChange={(value) => setReason(value as CautionReason)} />
        <Field label="메모" value={memo} onChangeText={setMemo} multiline placeholder="먹으면 속쓰림, 발진 등이 있다면 기록" />
        {message ? <InfoBanner text={message} tone={message.includes("실패") ? "danger" : "default"} /> : null}
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Button title={editingId ? "수정 저장" : "새로 등록"} onPress={handleSave} loading={loading} />
          </View>
          <View style={{ flex: 1 }}>
            <Button title="입력 초기화" onPress={resetForm} secondary />
          </View>
        </View>
      </SectionCard>

      {items.map((item) => (
        <SectionCard
          key={item.id}
          title={item.itemName || item.ingredientName || "이름 없음"}
          subtitle={`${item.itemName ? "약" : "성분"} · ${item.reason}`}
        >
          <Text style={{ color: "#547066", lineHeight: 22 }}>{item.memo || "메모 없음"}</Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Button
                title="수정"
                onPress={() => {
                  setEditingId(item.id);
                  setSelectedType(item.itemName ? "MEDICINE" : "INGREDIENT");
                  setSelectedSuggestion({
                    name: item.itemName || item.ingredientName || "",
                    type: item.itemName ? "MEDICINE" : "INGREDIENT",
                  });
                  setKeyword(item.itemName || item.ingredientName || "");
                  setReason(item.reason);
                  setMemo(item.memo || "");
                }}
                secondary
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button title="삭제" onPress={() => handleDelete(item.id)} />
            </View>
          </View>
        </SectionCard>
      ))}
    </Screen>
  );
}
