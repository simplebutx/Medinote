"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.styles = void 0;
exports.Screen = Screen;
exports.SectionCard = SectionCard;
exports.Field = Field;
exports.Button = Button;
exports.SuggestionButton = SuggestionButton;
exports.PillSelector = PillSelector;
exports.InfoBanner = InfoBanner;
var react_native_1 = require("react-native");
var react_native_safe_area_context_1 = require("react-native-safe-area-context");
function Screen(_a) {
    var children = _a.children;
    return (<react_native_safe_area_context_1.SafeAreaView style={exports.styles.safeArea} edges={["left", "right"]}>
      <react_native_1.ScrollView style={exports.styles.scroll} contentContainerStyle={exports.styles.content} keyboardShouldPersistTaps="handled">
        {children}
      </react_native_1.ScrollView>
    </react_native_safe_area_context_1.SafeAreaView>);
}
function SectionCard(_a) {
    var title = _a.title, subtitle = _a.subtitle, children = _a.children;
    return (<react_native_1.View style={exports.styles.card}>
      <react_native_1.Text style={exports.styles.cardTitle}>{title}</react_native_1.Text>
      {subtitle ? <react_native_1.Text style={exports.styles.cardSubtitle}>{subtitle}</react_native_1.Text> : null}
      <react_native_1.View style={{ gap: 12 }}>{children}</react_native_1.View>
    </react_native_1.View>);
}
function Field(_a) {
    var label = _a.label, value = _a.value, onChangeText = _a.onChangeText, placeholder = _a.placeholder, multiline = _a.multiline, secureTextEntry = _a.secureTextEntry, keyboardType = _a.keyboardType;
    return (<react_native_1.View style={{ gap: 6 }}>
      <react_native_1.Text style={exports.styles.label}>{label}</react_native_1.Text>
      <react_native_1.TextInput style={[exports.styles.input, multiline ? exports.styles.textarea : null]} value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#8aa39b" multiline={multiline} secureTextEntry={secureTextEntry} keyboardType={keyboardType} autoCapitalize="none"/>
    </react_native_1.View>);
}
function Button(_a) {
    var title = _a.title, onPress = _a.onPress, secondary = _a.secondary, disabled = _a.disabled, loading = _a.loading;
    return (<react_native_1.Pressable style={[
            exports.styles.button,
            secondary ? exports.styles.buttonSecondary : exports.styles.buttonPrimary,
            disabled ? exports.styles.buttonDisabled : null,
        ]} onPress={onPress} disabled={disabled || loading}>
      {loading ? (<react_native_1.ActivityIndicator color={secondary ? "#0f766e" : "#ffffff"}/>) : (<react_native_1.Text style={[exports.styles.buttonText, secondary ? exports.styles.buttonTextSecondary : null]}>{title}</react_native_1.Text>)}
    </react_native_1.Pressable>);
}
function SuggestionButton(_a) {
    var title = _a.title, onPress = _a.onPress;
    return (<react_native_1.Pressable style={exports.styles.suggestionButton} onPress={onPress}>
      <react_native_1.Text style={exports.styles.suggestionButtonText}>{title}</react_native_1.Text>
    </react_native_1.Pressable>);
}
function PillSelector(_a) {
    var options = _a.options, value = _a.value, onChange = _a.onChange;
    return (<react_native_1.View style={exports.styles.pillWrap}>
      {options.map(function (option) { return (<react_native_1.Pressable key={option.value} style={[exports.styles.pill, option.value === value ? exports.styles.pillActive : null]} onPress={function () { return onChange(option.value); }}>
          <react_native_1.Text style={[exports.styles.pillText, option.value === value ? exports.styles.pillTextActive : null]}>
            {option.label}
          </react_native_1.Text>
        </react_native_1.Pressable>); })}
    </react_native_1.View>);
}
function InfoBanner(_a) {
    var text = _a.text, _b = _a.tone, tone = _b === void 0 ? "default" : _b;
    var backgroundColor = tone === "success" ? "#e7f8ef" : tone === "danger" ? "#ffe8e5" : "#edf7f5";
    var color = tone === "danger" ? "#b42318" : "#16443b";
    return (<react_native_1.View style={[exports.styles.banner, { backgroundColor: backgroundColor }]}>
      <react_native_1.Text style={{ color: color, lineHeight: 20 }}>{text}</react_native_1.Text>
    </react_native_1.View>);
}
exports.styles = react_native_1.StyleSheet.create({
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
