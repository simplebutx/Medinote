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
exports.api = void 0;
var axios_1 = require("axios");
var servicePortMap = {
    auth: 8080,
    medication: 8081,
    consultation: 8082,
};
function baseUrl(settings, service) {
    return "http://".concat(settings.apiHost, ":").concat(servicePortMap[service]);
}
function request(settings_1, service_1, path_1) {
    return __awaiter(this, arguments, void 0, function (settings, service, path, options) {
        var response;
        var _a, _b;
        if (options === void 0) { options = {}; }
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, axios_1.default.request({
                        baseURL: baseUrl(settings, service),
                        url: path,
                        method: (_a = options.method) !== null && _a !== void 0 ? _a : "GET",
                        data: options.data,
                        params: options.params,
                        timeout: 30000,
                        headers: ((_b = options.session) === null || _b === void 0 ? void 0 : _b.accessToken)
                            ? {
                                Authorization: "Bearer ".concat(options.session.accessToken),
                            }
                            : undefined,
                    })];
                case 1:
                    response = _c.sent();
                    return [2 /*return*/, response.data];
            }
        });
    });
}
exports.api = {
    login: function (settings, email, password) {
        return request(settings, "auth", "/api/auth/login", {
            method: "POST",
            data: { email: email, password: password },
        });
    },
    sendVerificationCode: function (settings, email) {
        return request(settings, "auth", "/api/auth/email/verification-code", {
            method: "POST",
            data: { email: email, code: "" },
        });
    },
    verifyEmailCode: function (settings, email, code) {
        return request(settings, "auth", "/api/auth/email/verify", {
            method: "POST",
            data: { email: email, code: code },
        });
    },
    signupBasic: function (settings, payload) {
        return request(settings, "auth", "/api/auth/signup", {
            method: "POST",
            data: payload,
        });
    },
    suggestDiseases: function (settings, keyword) {
        return request(settings, "auth", "/api/auth/diseases/suggest", {
            params: { keyword: keyword },
        });
    },
    submitUserProfile: function (settings, payload) {
        return request(settings, "auth", "/api/auth/user/profile", {
            method: "POST",
            data: payload,
        });
    },
    logout: function (settings, session) {
        return request(settings, "auth", "/api/auth/logout", {
            method: "POST",
            session: session,
        });
    },
    suggestMedicines: function (settings, keyword) {
        return request(settings, "medication", "/api/medicines/suggest", {
            method: "POST",
            params: { keyword: keyword },
        });
    },
    searchMedicines: function (settings, keyword) {
        return request(settings, "medication", "/api/medicines/search", {
            params: { keyword: keyword },
        });
    },
    suggestCautions: function (settings, session, keyword, type) {
        return request(settings, "medication", "/api/me/cautions/suggest", {
            method: "POST",
            params: { keyword: keyword, type: type },
            session: session,
        });
    },
    getCautions: function (settings, session) {
        return request(settings, "medication", "/api/me/cautions", {
            session: session,
        });
    },
    createCaution: function (settings, session, payload) {
        return request(settings, "medication", "/api/me/cautions", {
            method: "POST",
            session: session,
            data: payload,
        });
    },
    updateCaution: function (settings, session, id, payload) {
        return request(settings, "medication", "/api/me/cautions/".concat(id), {
            method: "PATCH",
            session: session,
            data: payload,
        });
    },
    deleteCaution: function (settings, session, id) {
        return request(settings, "medication", "/api/me/cautions/".concat(id), {
            method: "DELETE",
            session: session,
        });
    },
    sendChatMessage: function (settings, message) {
        return request(settings, "consultation", "/api/chatbot/message", {
            method: "POST",
            data: { message: message },
        });
    },
    getSchedules: function (settings, session) {
        return request(settings, "medication", "/api/medication-schedules", {
            session: session,
        });
    },
    createSchedule: function (settings, session, data) {
        return request(settings, "medication", "/api/medication-schedules", {
            method: "POST",
            session: session,
            data: data,
        });
    },
    updateSchedule: function (settings, session, id, data) {
        return request(settings, "medication", "/api/medication-schedules/".concat(id), {
            method: "PUT",
            session: session,
            data: data,
        });
    },
    deleteSchedule: function (settings, session, id) {
        return request(settings, "medication", "/api/medication-schedules/".concat(id), {
            method: "DELETE",
            session: session,
        });
    },
    getScheduleTimes: function (settings, session, medicationScheduleId) {
        return request(settings, "medication", "/api/medication-schedule-times", {
            session: session,
            params: { medicationScheduleId: medicationScheduleId },
        });
    },
    createScheduleTime: function (settings, session, data) {
        return request(settings, "medication", "/api/medication-schedule-times", {
            method: "POST",
            session: session,
            data: data,
        });
    },
    updateScheduleTime: function (settings, session, id, data) {
        return request(settings, "medication", "/api/medication-schedule-times/".concat(id), {
            method: "PUT",
            session: session,
            data: data,
        });
    },
    deleteScheduleTime: function (settings, session, id) {
        return request(settings, "medication", "/api/medication-schedule-times/".concat(id), {
            method: "DELETE",
            session: session,
        });
    },
    getIntakeLogs: function (settings, session, medicationScheduleId) {
        return request(settings, "medication", "/api/medication-intake-logs", {
            session: session,
            params: { medicationScheduleId: medicationScheduleId },
        });
    },
    deleteIntakeLog: function (settings, session, id) {
        return request(settings, "medication", "/api/medication-intake-logs/".concat(id), {
            method: "DELETE",
            session: session,
        });
    },
};
