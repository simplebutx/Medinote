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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CautionsScreen = CautionsScreen;
var react_1 = require("react");
var react_native_1 = require("react-native");
var client_1 = require("../api/client");
var constants_1 = require("../constants");
var AppContext_1 = require("../context/AppContext");
var ui_1 = require("../ui");
function CautionsScreen() {
    var _this = this;
    var _a = (0, AppContext_1.useAppContext)(), settings = _a.settings, session = _a.session;
    var _b = (0, react_1.useState)("MEDICINE"), selectedType = _b[0], setSelectedType = _b[1];
    var _c = (0, react_1.useState)(""), keyword = _c[0], setKeyword = _c[1];
    var _d = (0, react_1.useState)(null), selectedSuggestion = _d[0], setSelectedSuggestion = _d[1];
    var _e = (0, react_1.useState)([]), suggestions = _e[0], setSuggestions = _e[1];
    var _f = (0, react_1.useState)("ALLERGY"), reason = _f[0], setReason = _f[1];
    var _g = (0, react_1.useState)(""), memo = _g[0], setMemo = _g[1];
    var _h = (0, react_1.useState)([]), items = _h[0], setItems = _h[1];
    var _j = (0, react_1.useState)(null), editingId = _j[0], setEditingId = _j[1];
    var _k = (0, react_1.useState)(""), message = _k[0], setMessage = _k[1];
    var _l = (0, react_1.useState)(false), loading = _l[0], setLoading = _l[1];
    var debounceRef = (0, react_1.useRef)(null);
    var loadItems = function () { return __awaiter(_this, void 0, void 0, function () {
        var response, error_1;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    if (!session)
                        return [2 /*return*/];
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, client_1.api.getCautions(settings, session)];
                case 2:
                    response = _c.sent();
                    setItems(response);
                    return [3 /*break*/, 4];
                case 3:
                    error_1 = _c.sent();
                    setMessage(((_b = (_a = error_1 === null || error_1 === void 0 ? void 0 : error_1.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message) || "주의 약/성분 목록을 불러오지 못했습니다.");
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    }); };
    (0, react_1.useEffect)(function () {
        loadItems();
    }, []);
    var clearKeywordState = function () {
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }
        setKeyword("");
        setSelectedSuggestion(null);
        setSuggestions([]);
        setMessage("");
        react_native_1.Keyboard.dismiss();
    };
    var handleKeywordChange = function (value) {
        setKeyword(value);
        setSelectedSuggestion(null);
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }
        var trimmed = value.trim();
        if (!trimmed || !session) {
            setSuggestions([]);
            return;
        }
        debounceRef.current = setTimeout(function () { return __awaiter(_this, void 0, void 0, function () {
            var response, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, client_1.api.suggestCautions(settings, session, trimmed, selectedType)];
                    case 1:
                        response = _b.sent();
                        setSuggestions(response);
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
    var resetForm = function () {
        clearKeywordState();
        setReason("ALLERGY");
        setMemo("");
        setEditingId(null);
    };
    var handleSave = function () { return __awaiter(_this, void 0, void 0, function () {
        var payload, error_2;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    if (!session)
                        return [2 /*return*/];
                    if (!selectedSuggestion) {
                        setMessage("자동완성 목록에서 먼저 약 또는 성분을 선택해 주세요.");
                        return [2 /*return*/];
                    }
                    payload = {
                        itemSeq: null,
                        itemName: selectedSuggestion.type === "MEDICINE" ? selectedSuggestion.name : null,
                        ingredientCode: null,
                        ingredientName: selectedSuggestion.type === "INGREDIENT" ? selectedSuggestion.name : null,
                        reason: reason,
                        memo: memo.trim() || null,
                    };
                    setLoading(true);
                    setMessage("");
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 7, 8, 9]);
                    if (!editingId) return [3 /*break*/, 3];
                    return [4 /*yield*/, client_1.api.updateCaution(settings, session, editingId, payload)];
                case 2:
                    _c.sent();
                    setMessage("주의 약/성분을 수정했습니다.");
                    return [3 /*break*/, 5];
                case 3: return [4 /*yield*/, client_1.api.createCaution(settings, session, payload)];
                case 4:
                    _c.sent();
                    setMessage("주의 약/성분을 등록했습니다.");
                    _c.label = 5;
                case 5:
                    resetForm();
                    return [4 /*yield*/, loadItems()];
                case 6:
                    _c.sent();
                    return [3 /*break*/, 9];
                case 7:
                    error_2 = _c.sent();
                    setMessage(((_b = (_a = error_2 === null || error_2 === void 0 ? void 0 : error_2.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message) || "저장에 실패했습니다.");
                    return [3 /*break*/, 9];
                case 8:
                    setLoading(false);
                    return [7 /*endfinally*/];
                case 9: return [2 /*return*/];
            }
        });
    }); };
    var handleDelete = function (id) { return __awaiter(_this, void 0, void 0, function () {
        var error_3;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    if (!session)
                        return [2 /*return*/];
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 4, , 5]);
                    return [4 /*yield*/, client_1.api.deleteCaution(settings, session, id)];
                case 2:
                    _c.sent();
                    setMessage("삭제했습니다.");
                    return [4 /*yield*/, loadItems()];
                case 3:
                    _c.sent();
                    return [3 /*break*/, 5];
                case 4:
                    error_3 = _c.sent();
                    setMessage(((_b = (_a = error_3 === null || error_3 === void 0 ? void 0 : error_3.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message) || "삭제에 실패했습니다.");
                    return [3 /*break*/, 5];
                case 5: return [2 /*return*/];
            }
        });
    }); };
    return (<ui_1.Screen>
      <ui_1.SectionCard title="주의 약/성분 등록" subtitle="약으로 등록할지 성분으로 등록할지 선택하고 자동완성에서 고른 뒤 이유와 메모를 남길 수 있습니다.">
        <ui_1.PillSelector options={[
            { value: "MEDICINE", label: "약" },
            { value: "INGREDIENT", label: "성분" },
        ]} value={selectedType} onChange={function (value) { return setSelectedType(value); }}/>

        <react_native_1.View style={{ flexDirection: "row", gap: 10, alignItems: "flex-end" }}>
          <react_native_1.View style={{ flex: 1 }}>
            <ui_1.Field label={selectedType === "MEDICINE" ? "약 검색" : "성분 검색"} value={keyword} onChangeText={handleKeywordChange} placeholder={selectedType === "MEDICINE" ? "타이레놀" : "아세트아미노펜"}/>
          </react_native_1.View>
          {(keyword || selectedSuggestion || suggestions.length > 0) ? (<react_native_1.Pressable onPress={clearKeywordState} style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#ffffff",
                borderWidth: 1,
                borderColor: "#cfe0da",
                marginBottom: 1,
            }}>
              <react_native_1.Text style={{ fontSize: 18, fontWeight: "800", color: "#35574e" }}>X</react_native_1.Text>
            </react_native_1.Pressable>) : null}
        </react_native_1.View>

        {suggestions.map(function (suggestion) { return (<ui_1.SuggestionButton key={"".concat(suggestion.type, "-").concat(suggestion.name)} title={"".concat(suggestion.name)} onPress={function () {
                react_native_1.Keyboard.dismiss();
                setSelectedSuggestion(suggestion);
                setKeyword(suggestion.name);
                setSuggestions([]);
            }}/>); })}

        <react_native_1.Text style={{ color: "#35574e", fontWeight: "700", fontSize: 14 }}>주의 이유</react_native_1.Text>
        <ui_1.PillSelector options={constants_1.reasonOptions} value={reason} onChange={function (value) { return setReason(value); }}/>
        <ui_1.Field label="메모" value={memo} onChangeText={setMemo} multiline placeholder="먹으면 속쓰림, 발진 등이 있다면 기록"/>

        {message ? <ui_1.InfoBanner text={message} tone={message.includes("실패") ? "danger" : "default"}/> : null}

        <react_native_1.View style={{ flexDirection: "row", gap: 10 }}>
          <react_native_1.View style={{ flex: 1 }}>
            <ui_1.Button title={editingId ? "수정 저장" : "새로 등록"} onPress={handleSave} loading={loading}/>
          </react_native_1.View>
          <react_native_1.View style={{ flex: 1 }}>
            <ui_1.Button title="입력 초기화" onPress={resetForm} secondary/>
          </react_native_1.View>
        </react_native_1.View>
      </ui_1.SectionCard>

      {items.map(function (item) { return (<ui_1.SectionCard key={item.id} title={item.itemName || item.ingredientName || "이름 없음"} subtitle={"".concat(item.itemName ? "약" : "성분", " \u00B7 ").concat(item.reason)}>
          <react_native_1.Text style={{ color: "#547066", lineHeight: 22 }}>{item.memo || "메모 없음"}</react_native_1.Text>
          <react_native_1.View style={{ flexDirection: "row", gap: 10 }}>
            <react_native_1.View style={{ flex: 1 }}>
              <ui_1.Button title="수정" onPress={function () {
                setEditingId(item.id);
                setSelectedType(item.itemName ? "MEDICINE" : "INGREDIENT");
                setSelectedSuggestion({
                    name: item.itemName || item.ingredientName || "",
                    type: item.itemName ? "MEDICINE" : "INGREDIENT",
                });
                setKeyword(item.itemName || item.ingredientName || "");
                setReason(item.reason);
                setMemo(item.memo || "");
            }} secondary/>
            </react_native_1.View>
            <react_native_1.View style={{ flex: 1 }}>
              <ui_1.Button title="삭제" onPress={function () { return handleDelete(item.id); }}/>
            </react_native_1.View>
          </react_native_1.View>
        </ui_1.SectionCard>); })}
    </ui_1.Screen>);
}
