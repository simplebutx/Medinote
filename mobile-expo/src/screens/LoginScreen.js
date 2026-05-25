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
exports.LoginScreen = LoginScreen;
var react_1 = require("react");
var client_1 = require("../api/client");
var AppContext_1 = require("../context/AppContext");
var ui_1 = require("../ui");
function LoginScreen(_a) {
    var _this = this;
    var navigation = _a.navigation;
    var _b = (0, AppContext_1.useAppContext)(), saveSession = _b.saveSession, settings = _b.settings;
    var _c = (0, react_1.useState)(""), email = _c[0], setEmail = _c[1];
    var _d = (0, react_1.useState)(""), password = _d[0], setPassword = _d[1];
    var _e = (0, react_1.useState)(""), message = _e[0], setMessage = _e[1];
    var _f = (0, react_1.useState)(false), loading = _f[0], setLoading = _f[1];
    var handleLogin = function () { return __awaiter(_this, void 0, void 0, function () {
        var response, error_1;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    if (!email.trim() || !password.trim()) {
                        setMessage("이메일과 비밀번호를 모두 입력해 주세요.");
                        return [2 /*return*/];
                    }
                    setLoading(true);
                    setMessage("");
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 4, 5, 6]);
                    return [4 /*yield*/, client_1.api.login(settings, email.trim(), password)];
                case 2:
                    response = _c.sent();
                    return [4 /*yield*/, saveSession(response)];
                case 3:
                    _c.sent();
                    setMessage("로그인되었습니다.");
                    return [3 /*break*/, 6];
                case 4:
                    error_1 = _c.sent();
                    setMessage(((_b = (_a = error_1 === null || error_1 === void 0 ? void 0 : error_1.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message) || (error_1 === null || error_1 === void 0 ? void 0 : error_1.message) || "로그인에 실패했습니다.");
                    return [3 /*break*/, 6];
                case 5:
                    setLoading(false);
                    return [7 /*endfinally*/];
                case 6: return [2 /*return*/];
            }
        });
    }); };
    return (<ui_1.Screen>
      <ui_1.SectionCard title="MyMedi Mobile" subtitle="지금까지 만든 사용자용 기능을 Expo 앱으로 옮긴 버전입니다. 아래 계정으로 바로 로그인하거나 회원가입을 진행할 수 있어요.">
        <ui_1.Field label="이메일" value={email} onChangeText={setEmail} keyboardType="email-address" placeholder="example@email.com"/>
        <ui_1.Field label="비밀번호" value={password} onChangeText={setPassword} secureTextEntry placeholder="비밀번호"/>
        {message ? <ui_1.InfoBanner text={message} tone={message.includes("실패") ? "danger" : "success"}/> : null}
        <ui_1.Button title="로그인" onPress={handleLogin} loading={loading}/>
        <ui_1.Button title="회원가입으로 이동" onPress={function () { return navigation.navigate("회원가입"); }} secondary/>
      </ui_1.SectionCard>
    </ui_1.Screen>);
}
