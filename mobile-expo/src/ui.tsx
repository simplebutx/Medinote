import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export function Screen({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaView style={styles.safeArea} edges={["left", "right"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {subtitle ? <Text style={styles.cardSubtitle}>{subtitle}</Text> : null}
      <View style={{ gap: 12 }}>{children}</View>
    </View>
  );
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  secureTextEntry,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address" | "numeric";
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline ? styles.textarea : null]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#8aa39b"
        multiline={multiline}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize="none"
      />
    </View>
  );
}

export function Button({
  title,
  onPress,
  secondary,
  disabled,
  loading,
}: {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <Pressable
      style={[
        styles.button,
        secondary ? styles.buttonSecondary : styles.buttonPrimary,
        disabled ? styles.buttonDisabled : null,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator color={secondary ? "#0f766e" : "#ffffff"} />
      ) : (
        <Text style={[styles.buttonText, secondary ? styles.buttonTextSecondary : null]}>{title}</Text>
      )}
    </Pressable>
  );
}

export function SuggestionButton({
  title,
  onPress,
}: {
  title: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.suggestionButton} onPress={onPress}>
      <Text style={styles.suggestionButtonText}>{title}</Text>
    </Pressable>
  );
}

export function PillSelector({
  options,
  value,
  onChange,
}: {
  options: Array<{ value: string; label: string }>;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <View style={styles.pillWrap}>
      {options.map((option) => (
        <Pressable
          key={option.value}
          style={[styles.pill, option.value === value ? styles.pillActive : null]}
          onPress={() => onChange(option.value)}
        >
          <Text style={[styles.pillText, option.value === value ? styles.pillTextActive : null]}>
            {option.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export function InfoBanner({
  text,
  tone = "default",
}: {
  text: string;
  tone?: "default" | "success" | "danger";
}) {
  const backgroundColor =
    tone === "success" ? "#e7f8ef" : tone === "danger" ? "#ffe8e5" : "#edf7f5";
  const color = tone === "danger" ? "#b42318" : "#16443b";

  return (
    <View style={[styles.banner, { backgroundColor }]}>
      <Text style={{ color, lineHeight: 20 }}>{text}</Text>
    </View>
  );
}

export const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f3f7f6",
  },
  scroll: {
    flex: 1,
    backgroundColor: "#f3f7f6",
  },
  content: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 18,
    gap: 14,
    borderWidth: 1,
    borderColor: "#d9e7e2",
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#10332b",
  },
  cardSubtitle: {
    fontSize: 14,
    color: "#547066",
    lineHeight: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#35574e",
  },
  input: {
    borderWidth: 1,
    borderColor: "#cfe0da",
    borderRadius: 16,
    backgroundColor: "#fbfdfc",
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#10332b",
    fontSize: 16,
  },
  textarea: {
    minHeight: 96,
    textAlignVertical: "top",
  },
  button: {
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    paddingHorizontal: 16,
  },
  buttonPrimary: {
    backgroundColor: "#0f766e",
  },
  buttonSecondary: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#b7cdc6",
  },
  suggestionButton: {
    minHeight: 50,
    justifyContent: "center",
    borderRadius: 16,
    paddingHorizontal: 16,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#b7cdc6",
    alignItems: "flex-start",
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 16,
  },
  buttonTextSecondary: {
    color: "#0f766e",
  },
  suggestionButtonText: {
    color: "#0f766e",
    fontWeight: "700",
    fontSize: 16,
    textAlign: "left",
    width: "100%",
  },
  pillWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  pill: {
    borderWidth: 1,
    borderColor: "#cde0da",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#ffffff",
  },
  pillActive: {
    backgroundColor: "#0f766e",
    borderColor: "#0f766e",
  },
  pillText: {
    color: "#36574f",
    fontWeight: "700",
  },
  pillTextActive: {
    color: "#ffffff",
  },
  banner: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
});
