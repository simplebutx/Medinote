"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatScreen = ChatScreen;
var react_1 = require("react");
var react_native_1 = require("react-native");
var client_1 = require("../api/client");
var AppContext_1 = require("../context/AppContext");
var ui_1 = require("../ui");
var emptyChatHint = "약 이름을 @로 입력하면 자동완성이 뜨고, 질문과 답변이 하나의 대화방처럼 이어집니다.";
function ChatScreen() {
    var _this = this;
    var settings = (0, AppContext_1.useAppContext)().settings;
    var _a = (0, react_1.useState)(""), message = _a[0], setMessage = _a[1];
    var _b = (0, react_1.useState)([]), history = _b[0], setHistory = _b[1];
    var _c = (0, react_1.useState)([]), suggestions = _c[0], setSuggestions = _c[1];
    var _d = (0, react_1.useState)(false), loading = _d[0], setLoading = _d[1];
    var debounceRef = (0, react_1.useRef)(null);
    var handleMessageChange = function (value) {
        setMessage(value);
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }
        var mentionMatch = value.match(/@([^\s@]*)$/);
        if (!(mentionMatch === null || mentionMatch === void 0 ? void 0 : mentionMatch[1])) {
            setSuggestions([]);
            return;
        }
        debounceRef.current = setTimeout(function () { return __awaiter(_this, void 0, void 0, function () {
            var items, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, client_1.api.suggestMedicines(settings, mentionMatch[1])];
                    case 1:
                        items = _b.sent();
                        setSuggestions(items);
                        return [3 /*break*/, 3];
                    case 2:
                        _a = _b.sent();
                        setSuggestions([]);
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        }); }, 220);
    };
    var handleSend = function () { return __awaiter(_this, void 0, void 0, function () {
        var userText, response_1, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!message.trim()) {
                        return [2 /*return*/];
                    }
                    userText = message.trim();
                    setLoading(true);
                    setSuggestions([]);
                    setMessage("");
                    setHistory(function (prev) { return __spreadArray(__spreadArray([], prev, true), [{ role: "user", text: userText }], false); });
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, 4, 5]);
                    return [4 /*yield*/, client_1.api.sendChatMessage(settings, userText)];
                case 2:
                    response_1 = _a.sent();
                    setHistory(function (prev) { return __spreadArray(__spreadArray([], prev, true), [
                        { role: "assistant", text: response_1.answer || "답변이 비어 있습니다." },
                    ], false); });
                    return [3 /*break*/, 5];
                case 3:
                    error_1 = _a.sent();
                    setHistory(function (prev) {
                        var _a, _b;
                        return __spreadArray(__spreadArray([], prev, true), [
                            { role: "assistant", text: ((_b = (_a = error_1 === null || error_1 === void 0 ? void 0 : error_1.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message) || "챗봇 요청에 실패했습니다." },
                        ], false);
                    });
                    return [3 /*break*/, 5];
                case 4:
                    setLoading(false);
                    return [7 /*endfinally*/];
                case 5: return [2 /*return*/];
            }
        });
    }); };
    return (<ui_1.Screen>
      <ui_1.SectionCard title="챗봇 상담" subtitle="질문과 답변이 하나의 채팅방처럼 이어집니다. 약 이름은 @로 입력하면 자동완성을 사용할 수 있어요.">
        <react_native_1.View style={{
            backgroundColor: "#f5faf8",
            borderRadius: 22,
            padding: 12,
            gap: 10,
            minHeight: 280,
            borderWidth: 1,
            borderColor: "#dbe9e4",
        }}>
          {!history.length ? (<react_native_1.View style={{
                flex: 1,
                minHeight: 240,
                alignItems: "center",
                justifyContent: "center",
                paddingHorizontal: 18,
            }}>
              <react_native_1.Text style={{ color: "#6a847c", lineHeight: 22, textAlign: "center" }}>
                {emptyChatHint}
              </react_native_1.Text>
            </react_native_1.View>) : (history.map(function (item, index) { return (<react_native_1.View key={"".concat(item.role, "-").concat(index)} style={{
                alignSelf: item.role === "user" ? "flex-end" : "flex-start",
                maxWidth: "84%",
                gap: 6,
            }}>
                <react_native_1.Text style={{
                color: "#6a847c",
                fontSize: 12,
                fontWeight: "700",
                textAlign: item.role === "user" ? "right" : "left",
            }}>
                  {item.role === "user" ? "나" : "챗봇"}
                </react_native_1.Text>
                <react_native_1.View style={{
                backgroundColor: item.role === "user" ? "#0f766e" : "#ffffff",
                borderRadius: 18,
                paddingHorizontal: 14,
                paddingVertical: 12,
                borderWidth: item.role === "user" ? 0 : 1,
                borderColor: "#d7e5e0",
            }}>
                  <react_native_1.Text style={{
                color: item.role === "user" ? "#ffffff" : "#23443c",
                lineHeight: 22,
            }}>
                    {item.text}
                  </react_native_1.Text>
                </react_native_1.View>
              </react_native_1.View>); }))}
        </react_native_1.View>

        <react_native_1.View style={{
            backgroundColor: "#ffffff",
            borderRadius: 22,
            borderWidth: 1,
            borderColor: "#d7e5e0",
            padding: 12,
            gap: 10,
        }}>
          <ui_1.Field label="질문 입력" value={message} onChangeText={handleMessageChange} multiline placeholder="@타이레놀 먹는 법 알려줘"/>

          {suggestions.map(function (suggestion) { return (<ui_1.SuggestionButton key={suggestion} title={"@".concat(suggestion)} onPress={function () {
                setMessage(function (prev) { return prev.replace(/@([^\s@]*)$/, "@".concat(suggestion, " ")); });
                setSuggestions([]);
            }}/>); })}

          <ui_1.Button title="보내기" onPress={handleSend} loading={loading}/>
        </react_native_1.View>

        {!history.length ? <ui_1.InfoBanner text={emptyChatHint}/> : null}
      </ui_1.SectionCard>
    </ui_1.Screen>);
}
