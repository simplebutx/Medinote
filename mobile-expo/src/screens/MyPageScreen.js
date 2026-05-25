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
exports.MyPageScreen = MyPageScreen;
var react_1 = require("react");
var react_native_1 = require("react-native");
var client_1 = require("../api/client");
var AppContext_1 = require("../context/AppContext");
var ui_1 = require("../ui");
function MyPageScreen(_a) {
    var _this = this;
    var navigation = _a.navigation;
    var _b = (0, AppContext_1.useAppContext)(), session = _b.session, settings = _b.settings, clearSession = _b.clearSession;
    var _c = (0, react_1.useState)(false), loading = _c[0], setLoading = _c[1];
    var handleLogout = function () { return __awaiter(_this, void 0, void 0, function () {
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    if (!session)
                        return [2 /*return*/];
                    setLoading(true);
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, 4, 6]);
                    return [4 /*yield*/, client_1.api.logout(settings, session)];
                case 2:
                    _b.sent();
                    return [3 /*break*/, 6];
                case 3:
                    _a = _b.sent();
                    return [3 /*break*/, 6];
                case 4: return [4 /*yield*/, clearSession()];
                case 5:
                    _b.sent();
                    setLoading(false);
                    return [7 /*endfinally*/];
                case 6: return [2 /*return*/];
            }
        });
    }); };
    return (<ui_1.Screen>
      <ui_1.SectionCard title="내 정보" subtitle="현재 로그인한 계정 정보와 개인 설정 메뉴를 확인할 수 있습니다.">
        <react_native_1.Text style={{ color: "#35574e", fontWeight: "700" }}>이메일</react_native_1.Text>
        <react_native_1.Text style={{ color: "#10332b", fontSize: 16 }}>{(session === null || session === void 0 ? void 0 : session.email) || "-"}</react_native_1.Text>
        <react_native_1.Text style={{ color: "#35574e", fontWeight: "700" }}>권한</react_native_1.Text>
        <react_native_1.Text style={{ color: "#10332b", fontSize: 16 }}>{(session === null || session === void 0 ? void 0 : session.role) || "-"}</react_native_1.Text>
      </ui_1.SectionCard>

      <ui_1.SectionCard title="내 관리" subtitle="자주 쓰는 개인 설정과 등록 정보를 여기서 관리합니다.">
        <ui_1.Button title="주의 약/성분 관리" onPress={function () { return navigation.navigate("MyCautions"); }} secondary/>
        <ui_1.Button title="로그아웃" onPress={handleLogout} loading={loading}/>
      </ui_1.SectionCard>
    </ui_1.Screen>);
}
