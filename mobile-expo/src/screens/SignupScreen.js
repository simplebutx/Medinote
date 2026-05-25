"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
exports.SignupScreen = SignupScreen;
var react_1 = require("react");
var react_native_1 = require("react-native");
var client_1 = require("../api/client");
var AppContext_1 = require("../context/AppContext");
var ui_1 = require("../ui");
var healthOptions = [
    { key: "isPregnant", label: "임산부" },
    { key: "isBreastfeeding", label: "수유 중" },
    { key: "isSmoking", label: "흡연" },
    { key: "isDrinking", label: "음주" },
];
function SignupScreen(_a) {
    var _this = this;
    var navigation = _a.navigation;
    var settings = (0, AppContext_1.useAppContext)().settings;
    var _b = (0, react_1.useState)(1), step = _b[0], setStep = _b[1];
    var _c = (0, react_1.useState)(""), email = _c[0], setEmail = _c[1];
    var _d = (0, react_1.useState)(""), password = _d[0], setPassword = _d[1];
    var _e = (0, react_1.useState)(""), username = _e[0], setUsername = _e[1];
    var _f = (0, react_1.useState)(""), birthDate = _f[0], setBirthDate = _f[1];
    var _g = (0, react_1.useState)("MALE"), gender = _g[0], setGender = _g[1];
    var _h = (0, react_1.useState)(""), verificationCode = _h[0], setVerificationCode = _h[1];
    var _j = (0, react_1.useState)(false), isCodeSent = _j[0], setIsCodeSent = _j[1];
    var _k = (0, react_1.useState)(false), isEmailVerified = _k[0], setIsEmailVerified = _k[1];
    var _l = (0, react_1.useState)(0), timeLeft = _l[0], setTimeLeft = _l[1];
    var _m = (0, react_1.useState)(false), stepOneLoading = _m[0], setStepOneLoading = _m[1];
    var _o = (0, react_1.useState)(false), stepTwoLoading = _o[0], setStepTwoLoading = _o[1];
    var _p = (0, react_1.useState)(""), message = _p[0], setMessage = _p[1];
    var _q = (0, react_1.useState)({
        isPregnant: false,
        isBreastfeeding: false,
        isSmoking: false,
        isDrinking: false,
    }), healthState = _q[0], setHealthState = _q[1];
    var _r = (0, react_1.useState)(""), diseaseInput = _r[0], setDiseaseInput = _r[1];
    var _s = (0, react_1.useState)([]), diseaseNames = _s[0], setDiseaseNames = _s[1];
    var _t = (0, react_1.useState)([]), diseaseSuggestions = _t[0], setDiseaseSuggestions = _t[1];
    var debounceRef = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(function () {
        if (timeLeft <= 0) {
            return;
        }
        var timer = setInterval(function () {
            setTimeLeft(function (prev) { return prev - 1; });
        }, 1000);
        return function () { return clearInterval(timer); };
    }, [timeLeft]);
    var countdownText = (0, react_1.useMemo)(function () {
        var min = String(Math.floor(timeLeft / 60)).padStart(2, "0");
        var sec = String(timeLeft % 60).padStart(2, "0");
        return "".concat(min, ":").concat(sec);
    }, [timeLeft]);
    var handleSendCode = function () { return __awaiter(_this, void 0, void 0, function () {
        var error_1;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    if (!email.trim()) {
                        setMessage("이메일을 먼저 입력해 주세요.");
                        return [2 /*return*/];
                    }
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, client_1.api.sendVerificationCode(settings, email.trim())];
                case 2:
                    _c.sent();
                    setIsCodeSent(true);
                    setTimeLeft(180);
                    setMessage("인증번호를 보냈습니다.");
                    return [3 /*break*/, 4];
                case 3:
                    error_1 = _c.sent();
                    setMessage(((_b = (_a = error_1 === null || error_1 === void 0 ? void 0 : error_1.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message) || "인증번호 발송에 실패했습니다.");
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    }); };
    var handleVerifyCode = function () { return __awaiter(_this, void 0, void 0, function () {
        var response, error_2;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    if (!verificationCode.trim()) {
                        setMessage("인증번호를 입력해 주세요.");
                        return [2 /*return*/];
                    }
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, client_1.api.verifyEmailCode(settings, email.trim(), verificationCode.trim())];
                case 2:
                    response = _c.sent();
                    setIsEmailVerified(response.verified);
                    setMessage(response.message || (response.verified ? "이메일 인증 완료" : "인증에 실패했습니다."));
                    if (response.verified) {
                        setTimeLeft(0);
                    }
                    return [3 /*break*/, 4];
                case 3:
                    error_2 = _c.sent();
                    setMessage(((_b = (_a = error_2 === null || error_2 === void 0 ? void 0 : error_2.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message) || "인증 확인에 실패했습니다.");
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    }); };
    var handleNext = function () { return __awaiter(_this, void 0, void 0, function () {
        var error_3;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    if (!isEmailVerified) {
                        setMessage("이메일 인증을 완료해야 다음 단계로 이동할 수 있습니다.");
                        return [2 /*return*/];
                    }
                    setStepOneLoading(true);
                    setMessage("");
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 3, 4, 5]);
                    return [4 /*yield*/, client_1.api.signupBasic(settings, {
                            email: email.trim(),
                            password: password,
                            username: username.trim(),
                            birthDate: birthDate,
                            gender: gender,
                            role: "USER",
                        })];
                case 2:
                    _c.sent();
                    setStep(2);
                    return [3 /*break*/, 5];
                case 3:
                    error_3 = _c.sent();
                    setMessage(((_b = (_a = error_3 === null || error_3 === void 0 ? void 0 : error_3.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message) || "기본 정보 저장에 실패했습니다.");
                    return [3 /*break*/, 5];
                case 4:
                    setStepOneLoading(false);
                    return [7 /*endfinally*/];
                case 5: return [2 /*return*/];
            }
        });
    }); };
    var handleDiseaseChange = function (value) {
        setDiseaseInput(value);
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }
        var keyword = value.trim().replace(/^@/, "");
        if (!keyword) {
            setDiseaseSuggestions([]);
            return;
        }
        debounceRef.current = setTimeout(function () { return __awaiter(_this, void 0, void 0, function () {
            var items, _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, client_1.api.suggestDiseases(settings, keyword)];
                    case 1:
                        items = _b.sent();
                        setDiseaseSuggestions(items.filter(function (item) { return !diseaseNames.includes(item); }));
                        return [3 /*break*/, 3];
                    case 2:
                        _a = _b.sent();
                        setDiseaseSuggestions([]);
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        }); }, 220);
    };
    var addDisease = function (value) {
        var next = value.trim().replace(/^@/, "");
        if (!next || diseaseNames.includes(next)) {
            setDiseaseInput("");
            setDiseaseSuggestions([]);
            return;
        }
        setDiseaseNames(function (prev) { return __spreadArray(__spreadArray([], prev, true), [next], false); });
        setDiseaseInput("");
        setDiseaseSuggestions([]);
    };
    var handleCompleteSignup = function () { return __awaiter(_this, void 0, void 0, function () {
        var error_4;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    setStepTwoLoading(true);
                    setMessage("");
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 3, 4, 5]);
                    return [4 /*yield*/, client_1.api.submitUserProfile(settings, __assign(__assign({ email: email.trim() }, healthState), { diseaseNames: diseaseNames }))];
                case 2:
                    _c.sent();
                    setMessage("회원가입이 완료되었습니다. 로그인 화면으로 돌아갑니다.");
                    setTimeout(function () { return navigation.goBack(); }, 800);
                    return [3 /*break*/, 5];
                case 3:
                    error_4 = _c.sent();
                    setMessage(((_b = (_a = error_4 === null || error_4 === void 0 ? void 0 : error_4.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message) || "추가 정보 저장에 실패했습니다.");
                    return [3 /*break*/, 5];
                case 4:
                    setStepTwoLoading(false);
                    return [7 /*endfinally*/];
                case 5: return [2 /*return*/];
            }
        });
    }); };
    return (<ui_1.Screen>
      {step === 1 ? (<ui_1.SectionCard title="회원가입 1단계" subtitle="현재 모바일 버전은 일반 사용자(USER) 흐름에 맞춰 구성했습니다.">
          <ui_1.Field label="이메일" value={email} onChangeText={setEmail} keyboardType="email-address"/>
          <ui_1.Button title={isCodeSent ? "인증번호 다시 보내기" : "인증번호 보내기"} onPress={handleSendCode} secondary/>
          {isCodeSent ? (<>
              <ui_1.Field label="인증번호" value={verificationCode} onChangeText={setVerificationCode}/>
              <react_native_1.View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
                <react_native_1.View style={{ flex: 1 }}>
                  <ui_1.Button title="인증 확인" onPress={handleVerifyCode} secondary/>
                </react_native_1.View>
                <react_native_1.Text style={{ color: "#0f766e", fontWeight: "700" }}>{timeLeft > 0 ? countdownText : ""}</react_native_1.Text>
              </react_native_1.View>
            </>) : null}
          <ui_1.Field label="비밀번호" value={password} onChangeText={setPassword} secureTextEntry/>
          <ui_1.Field label="이름" value={username} onChangeText={setUsername}/>
          <ui_1.Field label="생년월일" value={birthDate} onChangeText={setBirthDate} placeholder="YYYY-MM-DD"/>
          <react_native_1.View style={{ gap: 8 }}>
            <react_native_1.Text style={{ color: "#35574e", fontWeight: "700" }}>성별</react_native_1.Text>
            <ui_1.PillSelector options={[
                { value: "MALE", label: "남성" },
                { value: "FEMALE", label: "여성" },
            ]} value={gender} onChange={function (value) { return setGender(value); }}/>
          </react_native_1.View>
          {message ? <ui_1.InfoBanner text={message} tone={message.includes("실패") ? "danger" : "default"}/> : null}
          <ui_1.Button title="다음 단계" onPress={handleNext} loading={stepOneLoading}/>
        </ui_1.SectionCard>) : (<ui_1.SectionCard title="회원가입 2단계" subtitle="건강 정보와 기저질환은 추후 복약 일정, 주의 성분, 상담 흐름에 연결됩니다.">
          <react_native_1.Text style={{ color: "#35574e", fontWeight: "700", fontSize: 16 }}>건강 상태</react_native_1.Text>
          <ui_1.PillSelector options={healthOptions.map(function (option) { return ({
                value: option.key,
                label: "".concat(healthState[option.key] ? "선택됨" : "미선택", " \u00B7 ").concat(option.label),
            }); })} value="__multiple__" onChange={function () { }}/>
          <react_native_1.View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {healthOptions.map(function (option) { return (<react_native_1.Pressable key={option.key} onPress={function () {
                    return setHealthState(function (prev) {
                        var _a;
                        return (__assign(__assign({}, prev), (_a = {}, _a[option.key] = !prev[option.key], _a)));
                    });
                }} style={{
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: healthState[option.key] ? "#0f766e" : "#cde0da",
                    backgroundColor: healthState[option.key] ? "#0f766e" : "#ffffff",
                }}>
                <react_native_1.Text style={{ color: healthState[option.key] ? "#ffffff" : "#35574e", fontWeight: "700" }}>
                  {option.label}
                </react_native_1.Text>
              </react_native_1.Pressable>); })}
          </react_native_1.View>

          <ui_1.Field label="기저질환" value={diseaseInput} onChangeText={handleDiseaseChange} placeholder="@당뇨, 고혈압처럼 입력"/>
          {diseaseSuggestions.map(function (suggestion) { return (<ui_1.Button key={suggestion} title={"\uCD94\uAC00: ".concat(suggestion)} onPress={function () { return addDisease(suggestion); }} secondary/>); })}
          {diseaseInput.trim() ? <ui_1.Button title={"\uC9C1\uC811 \uCD94\uAC00: ".concat(diseaseInput.trim())} onPress={function () { return addDisease(diseaseInput); }} secondary/> : null}

          <react_native_1.View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {diseaseNames.map(function (disease) { return (<react_native_1.Pressable key={disease} onPress={function () { return setDiseaseNames(function (prev) { return prev.filter(function (item) { return item !== disease; }); }); }} style={{
                    backgroundColor: "#edf7f5",
                    borderRadius: 999,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderWidth: 1,
                    borderColor: "#cde0da",
                }}>
                <react_native_1.Text style={{ color: "#0f766e", fontWeight: "700" }}>#{disease} 삭제</react_native_1.Text>
              </react_native_1.Pressable>); })}
          </react_native_1.View>

          {message ? <ui_1.InfoBanner text={message} tone={message.includes("실패") ? "danger" : "default"}/> : null}
          <ui_1.Button title="회원가입 완료" onPress={handleCompleteSignup} loading={stepTwoLoading}/>
        </ui_1.SectionCard>)}
    </ui_1.Screen>);
}
