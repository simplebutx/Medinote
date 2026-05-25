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
exports.ScheduleScreen = ScheduleScreen;
var vector_icons_1 = require("@expo/vector-icons");
var react_1 = require("react");
var react_native_1 = require("react-native");
var client_1 = require("../api/client");
var constants_1 = require("../constants");
var AppContext_1 = require("../context/AppContext");
var utils_1 = require("../utils");
var ui_1 = require("../ui");
var WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];
function createTimeSlots(count) {
    return Array.from({ length: count }, function (_, index) { return ({
        takeTime: "",
        timing: "AFTER_MEAL",
        sortOrder: index + 1,
    }); });
}
function createDefaultForm() {
    return {
        customMedicineName: "",
        hospitalName: "",
        pharmacyName: "",
        dosageAmount: "1",
        dosageUnit: "TABLET",
        timesPerDay: "3",
        durationDays: "7",
        prescribedDate: (0, utils_1.todayDateInput)(),
        dispensedDate: (0, utils_1.todayDateInput)(),
    };
}
function formatIsoDate(date) {
    var year = date.getFullYear();
    var month = String(date.getMonth() + 1).padStart(2, "0");
    var day = String(date.getDate()).padStart(2, "0");
    return "".concat(year, "-").concat(month, "-").concat(day);
}
function parseServerDateTime(value) {
    if (!value) {
        return null;
    }
    if (/[zZ]$|[+-]\d{2}:\d{2}$/.test(value)) {
        return new Date(value);
    }
    return new Date("".concat(value, "Z"));
}
function normalizeTakeTime(value) {
    if (!value) {
        return "";
    }
    return String(value).slice(0, 5);
}
function getEffectiveScheduleWindow(schedule, scheduleTimes) {
    var orderedTimes = __spreadArray([], scheduleTimes, true).map(function (time) { return normalizeTakeTime(time.takeTime); })
        .filter(Boolean)
        .sort();
    var createdAt = parseServerDateTime(schedule.createdAt);
    var createdAtDate = createdAt && !Number.isNaN(createdAt.getTime()) ? formatIsoDate(createdAt) : null;
    var createdAtTime = createdAt
        ? "".concat(String(createdAt.getHours()).padStart(2, "0"), ":").concat(String(createdAt.getMinutes()).padStart(2, "0"))
        : null;
    var fallbackStartDate = schedule.startDate || createdAtDate;
    if (!fallbackStartDate) {
        return {
            startDate: null,
            endDate: null,
        };
    }
    if (!orderedTimes.length) {
        return {
            startDate: fallbackStartDate,
            endDate: schedule.endDate || fallbackStartDate,
        };
    }
    var firstAvailableToday = createdAtDate === fallbackStartDate && createdAtTime
        ? orderedTimes.filter(function (takeTime) { return takeTime >= createdAtTime; })
        : orderedTimes;
    var normalizedStartDate = firstAvailableToday.length > 0
        ? fallbackStartDate
        : (function () {
            var nextDate = new Date("".concat(fallbackStartDate, "T00:00:00"));
            nextDate.setDate(nextDate.getDate() + 1);
            return formatIsoDate(nextDate);
        })();
    var totalDailySlots = orderedTimes.length;
    var totalDoseCount = Math.max(Number(schedule.durationDays) || 1, 1) * totalDailySlots;
    var firstDayDoseCount = normalizedStartDate === fallbackStartDate ? Math.max(firstAvailableToday.length, 1) : totalDailySlots;
    var remainingDoses = totalDoseCount;
    var currentDate = normalizedStartDate;
    while (remainingDoses > 0) {
        var dayTimes = currentDate === normalizedStartDate ? firstDayDoseCount : totalDailySlots;
        remainingDoses -= Math.min(remainingDoses, Math.max(dayTimes, 1));
        if (remainingDoses > 0) {
            var nextDate = new Date("".concat(currentDate, "T00:00:00"));
            nextDate.setDate(nextDate.getDate() + 1);
            currentDate = formatIsoDate(nextDate);
        }
    }
    return {
        startDate: normalizedStartDate,
        endDate: currentDate,
    };
}
function getDoseTimesForDate(schedule, scheduleTimes, targetDate) {
    var _a = getEffectiveScheduleWindow(schedule, scheduleTimes), startDate = _a.startDate, endDate = _a.endDate;
    if (!startDate || !endDate || targetDate < startDate || targetDate > endDate) {
        return [];
    }
    var orderedTimes = __spreadArray([], scheduleTimes, true).map(function (time) { return normalizeTakeTime(time.takeTime); })
        .filter(Boolean)
        .sort();
    if (!orderedTimes.length) {
        return [];
    }
    var createdAt = parseServerDateTime(schedule.createdAt);
    var createdAtDate = createdAt && !Number.isNaN(createdAt.getTime()) ? formatIsoDate(createdAt) : null;
    var createdAtTime = createdAt
        ? "".concat(String(createdAt.getHours()).padStart(2, "0"), ":").concat(String(createdAt.getMinutes()).padStart(2, "0"))
        : null;
    var firstDayTimes = createdAtDate === startDate && createdAtTime
        ? orderedTimes.filter(function (takeTime) { return takeTime >= createdAtTime; })
        : orderedTimes;
    var totalDailySlots = orderedTimes.length;
    var totalDoseCount = Math.max(Number(schedule.durationDays) || 1, 1) * totalDailySlots;
    var remainingDoses = totalDoseCount;
    var currentDate = startDate;
    while (remainingDoses > 0) {
        var dayTimes = currentDate === startDate ? firstDayTimes : orderedTimes;
        var visibleTimes = dayTimes.slice(0, remainingDoses);
        if (currentDate === targetDate) {
            return visibleTimes;
        }
        remainingDoses -= visibleTimes.length;
        var nextDate = new Date("".concat(currentDate, "T00:00:00"));
        nextDate.setDate(nextDate.getDate() + 1);
        currentDate = formatIsoDate(nextDate);
    }
    return [];
}
function buildCalendarDays(referenceMonth, schedules) {
    var year = referenceMonth.getFullYear();
    var month = referenceMonth.getMonth();
    var firstDay = new Date(year, month, 1);
    var gridStart = new Date(firstDay);
    gridStart.setDate(firstDay.getDate() - firstDay.getDay());
    return Array.from({ length: 42 }, function (_, index) {
        var current = new Date(gridStart);
        current.setDate(gridStart.getDate() + index);
        var isoDate = formatIsoDate(current);
        var matchingSchedules = schedules.filter(function (schedule) {
            if (!schedule.effectiveStartDate || !schedule.effectiveEndDate) {
                return false;
            }
            return schedule.effectiveStartDate <= isoDate && schedule.effectiveEndDate >= isoDate;
        });
        return {
            isoDate: isoDate,
            dayNumber: current.getDate(),
            isCurrentMonth: current.getMonth() === month,
            isToday: isoDate === formatIsoDate(new Date()),
            schedules: matchingSchedules,
        };
    });
}
function getScheduleSummary(schedule) {
    var _a;
    return schedule.customMedicineName || "\uC57D #".concat((_a = schedule.medicineId) !== null && _a !== void 0 ? _a : "-");
}
function ScheduleScreen(_a) {
    var _this = this;
    var navigation = _a.navigation;
    var _b = (0, AppContext_1.useAppContext)(), settings = _b.settings, session = _b.session;
    var _c = (0, react_1.useState)([]), items = _c[0], setItems = _c[1];
    var _d = (0, react_1.useState)({}), scheduleTimesById = _d[0], setScheduleTimesById = _d[1];
    var _e = (0, react_1.useState)(""), message = _e[0], setMessage = _e[1];
    var _f = (0, react_1.useState)(false), loading = _f[0], setLoading = _f[1];
    var _g = (0, react_1.useState)(false), calendarLoading = _g[0], setCalendarLoading = _g[1];
    var _h = (0, react_1.useState)(null), editingId = _h[0], setEditingId = _h[1];
    var _j = (0, react_1.useState)(createDefaultForm()), form = _j[0], setForm = _j[1];
    var _k = (0, react_1.useState)(createTimeSlots(3)), timeSlots = _k[0], setTimeSlots = _k[1];
    var _l = (0, react_1.useState)("calendar"), mode = _l[0], setMode = _l[1];
    var _m = (0, react_1.useState)(false), plusModalVisible = _m[0], setPlusModalVisible = _m[1];
    var _o = (0, react_1.useState)(function () {
        var today = new Date();
        return new Date(today.getFullYear(), today.getMonth(), 1);
    }), currentMonth = _o[0], setCurrentMonth = _o[1];
    var _p = (0, react_1.useState)(formatIsoDate(new Date())), selectedDate = _p[0], setSelectedDate = _p[1];
    (0, react_1.useLayoutEffect)(function () {
        navigation.setOptions({
            headerRight: function () { return (<react_native_1.Pressable onPress={function () { return setPlusModalVisible(true); }} style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "#edf7f5",
                }}>
          <vector_icons_1.Ionicons name="add" size={22} color="#0f766e"/>
        </react_native_1.Pressable>); },
        });
    }, [navigation]);
    var timesPerDay = (0, react_1.useMemo)(function () {
        var parsed = Number(form.timesPerDay);
        if (!Number.isFinite(parsed) || parsed < 1)
            return 1;
        return Math.min(parsed, 12);
    }, [form.timesPerDay]);
    (0, react_1.useEffect)(function () {
        setTimeSlots(function (prev) {
            return Array.from({ length: timesPerDay }, function (_, index) { return (__assign(__assign({}, (prev[index] || createTimeSlots(timesPerDay)[index])), { sortOrder: index + 1 })); });
        });
    }, [timesPerDay]);
    var loadSchedules = function () { return __awaiter(_this, void 0, void 0, function () {
        var response, timeEntries, nextScheduleTimesById_1, error_1;
        var _this = this;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    if (!session)
                        return [2 /*return*/];
                    setCalendarLoading(true);
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 4, 5, 6]);
                    return [4 /*yield*/, client_1.api.getSchedules(settings, session)];
                case 2:
                    response = _c.sent();
                    return [4 /*yield*/, Promise.all(response.map(function (schedule) { return __awaiter(_this, void 0, void 0, function () {
                            var _a;
                            return __generator(this, function (_b) {
                                switch (_b.label) {
                                    case 0:
                                        _a = [schedule.id];
                                        return [4 /*yield*/, client_1.api.getScheduleTimes(settings, session, schedule.id)];
                                    case 1: return [2 /*return*/, _a.concat([
                                            _b.sent()
                                        ])];
                                }
                            });
                        }); }))];
                case 3:
                    timeEntries = _c.sent();
                    nextScheduleTimesById_1 = Object.fromEntries(timeEntries);
                    setScheduleTimesById(nextScheduleTimesById_1);
                    setItems(response.map(function (schedule) {
                        var window = getEffectiveScheduleWindow(schedule, nextScheduleTimesById_1[schedule.id] || []);
                        return __assign(__assign({}, schedule), { effectiveStartDate: window.startDate, effectiveEndDate: window.endDate });
                    }));
                    return [3 /*break*/, 6];
                case 4:
                    error_1 = _c.sent();
                    setMessage(((_b = (_a = error_1 === null || error_1 === void 0 ? void 0 : error_1.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message) || "복약 일정을 불러오지 못했습니다.");
                    return [3 /*break*/, 6];
                case 5:
                    setCalendarLoading(false);
                    return [7 /*endfinally*/];
                case 6: return [2 /*return*/];
            }
        });
    }); };
    (0, react_1.useEffect)(function () {
        loadSchedules();
    }, []);
    var resetForm = function () {
        setEditingId(null);
        setForm(createDefaultForm());
        setTimeSlots(createTimeSlots(3));
    };
    var openCreateForm = function () {
        resetForm();
        setPlusModalVisible(false);
        setMode("form");
    };
    var openCalendar = function () {
        resetForm();
        setMode("calendar");
    };
    var buildPayload = function () { return ({
        medicineId: null,
        customMedicineName: form.customMedicineName || null,
        hospitalName: form.hospitalName || null,
        pharmacyName: form.pharmacyName || null,
        dosageAmount: form.dosageAmount ? Number(form.dosageAmount) : null,
        dosageUnit: form.dosageUnit || null,
        frequencyType: "DAILY",
        timesPerDay: timesPerDay,
        intervalHours: null,
        durationDays: Number(form.durationDays) || 1,
        startDate: null,
        endDate: null,
        prescribedDate: form.prescribedDate || null,
        dispensedDate: form.dispensedDate || null,
        isActive: null,
    }); };
    var handleSave = function () { return __awaiter(_this, void 0, void 0, function () {
        var schedule_1, _a, existingTimes, _b, error_2;
        var _c, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    if (!session)
                        return [2 /*return*/];
                    setLoading(true);
                    setMessage("");
                    _e.label = 1;
                case 1:
                    _e.trys.push([1, 12, 13, 14]);
                    if (!editingId) return [3 /*break*/, 3];
                    return [4 /*yield*/, client_1.api.updateSchedule(settings, session, editingId, buildPayload())];
                case 2:
                    _a = _e.sent();
                    return [3 /*break*/, 5];
                case 3: return [4 /*yield*/, client_1.api.createSchedule(settings, session, buildPayload())];
                case 4:
                    _a = _e.sent();
                    _e.label = 5;
                case 5:
                    schedule_1 = _a;
                    if (!editingId) return [3 /*break*/, 7];
                    return [4 /*yield*/, client_1.api.getScheduleTimes(settings, session, schedule_1.id)];
                case 6:
                    _b = _e.sent();
                    return [3 /*break*/, 8];
                case 7:
                    _b = [];
                    _e.label = 8;
                case 8:
                    existingTimes = _b;
                    return [4 /*yield*/, Promise.all(existingTimes.map(function (time) { return client_1.api.deleteScheduleTime(settings, session, time.id); }))];
                case 9:
                    _e.sent();
                    return [4 /*yield*/, Promise.all(timeSlots.map(function (slot, index) {
                            return client_1.api.createScheduleTime(settings, session, {
                                medicationScheduleId: schedule_1.id,
                                timing: slot.timing,
                                takeTime: slot.takeTime || "09:00",
                                sortOrder: index + 1,
                            });
                        }))];
                case 10:
                    _e.sent();
                    setMessage(editingId ? "복약 일정을 수정했습니다." : "복약 일정을 등록했습니다.");
                    openCalendar();
                    return [4 /*yield*/, loadSchedules()];
                case 11:
                    _e.sent();
                    return [3 /*break*/, 14];
                case 12:
                    error_2 = _e.sent();
                    setMessage(((_d = (_c = error_2 === null || error_2 === void 0 ? void 0 : error_2.response) === null || _c === void 0 ? void 0 : _c.data) === null || _d === void 0 ? void 0 : _d.message) || "복약 일정 저장에 실패했습니다.");
                    return [3 /*break*/, 14];
                case 13:
                    setLoading(false);
                    return [7 /*endfinally*/];
                case 14: return [2 /*return*/];
            }
        });
    }); };
    var handleEdit = function (item) { return __awaiter(_this, void 0, void 0, function () {
        var times, ordered, error_3;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    if (!session)
                        return [2 /*return*/];
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, client_1.api.getScheduleTimes(settings, session, item.id)];
                case 2:
                    times = _c.sent();
                    ordered = __spreadArray([], times, true).sort(function (a, b) { return a.sortOrder - b.sortOrder; });
                    setEditingId(item.id);
                    setForm({
                        customMedicineName: item.customMedicineName || "",
                        hospitalName: item.hospitalName || "",
                        pharmacyName: item.pharmacyName || "",
                        dosageAmount: item.dosageAmount ? String(item.dosageAmount) : "",
                        dosageUnit: item.dosageUnit || "TABLET",
                        timesPerDay: item.timesPerDay ? String(item.timesPerDay) : "1",
                        durationDays: item.durationDays ? String(item.durationDays) : "1",
                        prescribedDate: item.prescribedDate || (0, utils_1.todayDateInput)(),
                        dispensedDate: item.dispensedDate || (0, utils_1.todayDateInput)(),
                    });
                    setTimeSlots(ordered.length
                        ? ordered.map(function (time) { return ({
                            takeTime: normalizeTakeTime(time.takeTime),
                            timing: time.timing,
                            sortOrder: time.sortOrder,
                        }); })
                        : createTimeSlots(item.timesPerDay || 1));
                    setMode("form");
                    return [3 /*break*/, 4];
                case 3:
                    error_3 = _c.sent();
                    setMessage(((_b = (_a = error_3 === null || error_3 === void 0 ? void 0 : error_3.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message) || "일정 상세 조회에 실패했습니다.");
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    }); };
    var handleDelete = function (item) { return __awaiter(_this, void 0, void 0, function () {
        var _a, times, logs, error_4;
        var _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    if (!session)
                        return [2 /*return*/];
                    _d.label = 1;
                case 1:
                    _d.trys.push([1, 7, , 8]);
                    return [4 /*yield*/, Promise.all([
                            client_1.api.getScheduleTimes(settings, session, item.id),
                            client_1.api.getIntakeLogs(settings, session, item.id),
                        ])];
                case 2:
                    _a = _d.sent(), times = _a[0], logs = _a[1];
                    return [4 /*yield*/, Promise.all(logs.map(function (log) { return client_1.api.deleteIntakeLog(settings, session, log.id); }))];
                case 3:
                    _d.sent();
                    return [4 /*yield*/, Promise.all(times.map(function (time) { return client_1.api.deleteScheduleTime(settings, session, time.id); }))];
                case 4:
                    _d.sent();
                    return [4 /*yield*/, client_1.api.deleteSchedule(settings, session, item.id)];
                case 5:
                    _d.sent();
                    setMessage("복약 일정을 삭제했습니다.");
                    return [4 /*yield*/, loadSchedules()];
                case 6:
                    _d.sent();
                    return [3 /*break*/, 8];
                case 7:
                    error_4 = _d.sent();
                    setMessage(((_c = (_b = error_4 === null || error_4 === void 0 ? void 0 : error_4.response) === null || _b === void 0 ? void 0 : _b.data) === null || _c === void 0 ? void 0 : _c.message) || "복약 일정 삭제에 실패했습니다.");
                    return [3 /*break*/, 8];
                case 8: return [2 /*return*/];
            }
        });
    }); };
    var calendarDays = (0, react_1.useMemo)(function () { return buildCalendarDays(currentMonth, items); }, [currentMonth, items]);
    var selectedDaySchedules = (0, react_1.useMemo)(function () {
        return items.filter(function (schedule) {
            return schedule.effectiveStartDate &&
                schedule.effectiveEndDate &&
                schedule.effectiveStartDate <= selectedDate &&
                schedule.effectiveEndDate >= selectedDate;
        });
    }, [items, selectedDate]);
    var moveMonth = function (offset) {
        setCurrentMonth(function (prev) { return new Date(prev.getFullYear(), prev.getMonth() + offset, 1); });
    };
    return (<>
      <ui_1.Screen>
        {mode === "calendar" ? (<>
            <ui_1.SectionCard title="복약 캘린더" subtitle="날짜별로 내 복약 일정이 얼마나 겹치는지 먼저 확인하고, 필요한 날의 일정을 바로 열어볼 수 있어요.">
              <react_native_1.View style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
            }}>
                <ui_1.Button title="이전 달" onPress={function () { return moveMonth(-1); }} secondary/>
                <react_native_1.Text style={{ color: "#10332b", fontSize: 18, fontWeight: "800" }}>
                  {currentMonth.getFullYear()}년 {currentMonth.getMonth() + 1}월
                </react_native_1.Text>
                <ui_1.Button title="다음 달" onPress={function () { return moveMonth(1); }} secondary/>
              </react_native_1.View>

              <react_native_1.View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {WEEKDAY_LABELS.map(function (label) { return (<react_native_1.View key={label} style={{
                    width: "12.9%",
                    minWidth: 40,
                    alignItems: "center",
                }}>
                    <react_native_1.Text style={{ color: "#547066", fontWeight: "700" }}>{label}</react_native_1.Text>
                  </react_native_1.View>); })}
              </react_native_1.View>

              <react_native_1.View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {calendarDays.map(function (day) {
                var isSelected = selectedDate === day.isoDate;
                return (<react_native_1.Pressable key={day.isoDate} onPress={function () { return setSelectedDate(day.isoDate); }} style={{
                        width: "12.9%",
                        minWidth: 40,
                        minHeight: 88,
                        borderRadius: 18,
                        borderWidth: 1,
                        borderColor: isSelected ? "#0f766e" : "#d9e7e2",
                        backgroundColor: isSelected ? "#edf7f5" : "#ffffff",
                        paddingHorizontal: 8,
                        paddingVertical: 10,
                        opacity: day.isCurrentMonth ? 1 : 0.45,
                        gap: 6,
                    }}>
                      <react_native_1.Text style={{
                        color: day.isToday ? "#0f766e" : "#10332b",
                        fontWeight: day.isToday ? "800" : "700",
                    }}>
                        {day.dayNumber}
                      </react_native_1.Text>
                      {day.schedules.length ? (<>
                          <react_native_1.View style={{
                            alignSelf: "flex-start",
                            borderRadius: 999,
                            backgroundColor: "#d8f1eb",
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                        }}>
                            <react_native_1.Text style={{ color: "#0f766e", fontSize: 11, fontWeight: "700" }}>
                              {day.schedules.length}개
                            </react_native_1.Text>
                          </react_native_1.View>
                          {day.schedules.slice(0, 1).map(function (schedule) { return (<react_native_1.Text key={"".concat(day.isoDate, "-").concat(schedule.id)} numberOfLines={2} style={{ color: "#35574e", fontSize: 11, lineHeight: 14 }}>
                              {getScheduleSummary(schedule)}
                            </react_native_1.Text>); })}
                        </>) : null}
                    </react_native_1.Pressable>);
            })}
              </react_native_1.View>
            </ui_1.SectionCard>

            <ui_1.SectionCard title={"".concat(selectedDate, " \uC77C\uC815")} subtitle="선택한 날짜에 진행 중인 복약 일정을 확인하고, 눌러서 수정할 수 있어요.">
              {calendarLoading ? (<react_native_1.Text style={{ color: "#547066" }}>일정을 불러오는 중입니다.</react_native_1.Text>) : selectedDaySchedules.length ? (<react_native_1.View style={{ gap: 12 }}>
                  {selectedDaySchedules.map(function (item) {
                    var doseTimes = getDoseTimesForDate(item, scheduleTimesById[item.id] || [], selectedDate);
                    return (<react_native_1.Pressable key={"selected-".concat(item.id)} onPress={function () { return handleEdit(item); }} style={{
                            borderWidth: 1,
                            borderColor: "#d9e7e2",
                            borderRadius: 18,
                            padding: 14,
                            gap: 6,
                            backgroundColor: "#fbfdfc",
                        }}>
                        <react_native_1.Text style={{ color: "#10332b", fontSize: 16, fontWeight: "800" }}>
                          {(0, utils_1.formatScheduleLabel)(item)}
                        </react_native_1.Text>
                        <react_native_1.Text style={{ color: "#547066", lineHeight: 20 }}>
                          {item.hospitalName || "병원 미입력"} · {item.pharmacyName || "약국 미입력"}
                        </react_native_1.Text>
                        <react_native_1.Text style={{ color: "#547066", lineHeight: 20 }}>
                          {item.effectiveStartDate || "-"} ~ {item.effectiveEndDate || "-"}
                        </react_native_1.Text>
                        <react_native_1.Text style={{ color: "#547066", lineHeight: 20 }}>
                          복용 시간: {doseTimes.length ? doseTimes.join(", ") : "없음"}
                        </react_native_1.Text>
                        <react_native_1.View style={{ marginTop: 6 }}>
                          <ui_1.Button title="삭제" onPress={function () { return handleDelete(item); }}/>
                        </react_native_1.View>
                      </react_native_1.Pressable>);
                })}
                </react_native_1.View>) : (<react_native_1.Text style={{ color: "#547066", lineHeight: 22 }}>
                  선택한 날짜에는 등록된 복약 일정이 없습니다.
                </react_native_1.Text>)}
            </ui_1.SectionCard>
          </>) : (<ui_1.SectionCard title={editingId ? "복약 일정 수정" : "복약 일정 등록"} subtitle="직접 입력으로 약 이름, 병원, 복용 기간과 시간대를 등록할 수 있어요.">
            <ui_1.Button title="캘린더로 돌아가기" onPress={openCalendar} secondary/>
            <ui_1.Field label="약 이름" value={form.customMedicineName} onChangeText={function (value) { return setForm(function (prev) { return (__assign(__assign({}, prev), { customMedicineName: value })); }); }}/>
            <ui_1.Field label="병원명" value={form.hospitalName} onChangeText={function (value) { return setForm(function (prev) { return (__assign(__assign({}, prev), { hospitalName: value })); }); }}/>
            <ui_1.Field label="약국명" value={form.pharmacyName} onChangeText={function (value) { return setForm(function (prev) { return (__assign(__assign({}, prev), { pharmacyName: value })); }); }}/>
            <ui_1.Field label="복용량" value={form.dosageAmount} onChangeText={function (value) { return setForm(function (prev) { return (__assign(__assign({}, prev), { dosageAmount: value })); }); }} keyboardType="numeric"/>
            <ui_1.PillSelector options={constants_1.dosageUnitOptions} value={form.dosageUnit} onChange={function (value) { return setForm(function (prev) { return (__assign(__assign({}, prev), { dosageUnit: value })); }); }}/>
            <ui_1.Field label="하루 복용 횟수" value={form.timesPerDay} onChangeText={function (value) { return setForm(function (prev) { return (__assign(__assign({}, prev), { timesPerDay: value })); }); }} keyboardType="numeric"/>
            <ui_1.Field label="총 복용 일수" value={form.durationDays} onChangeText={function (value) { return setForm(function (prev) { return (__assign(__assign({}, prev), { durationDays: value })); }); }} keyboardType="numeric"/>
            <ui_1.Field label="처방일" value={form.prescribedDate} onChangeText={function (value) { return setForm(function (prev) { return (__assign(__assign({}, prev), { prescribedDate: value })); }); }} placeholder="YYYY-MM-DD"/>
            <ui_1.Field label="조제일" value={form.dispensedDate} onChangeText={function (value) { return setForm(function (prev) { return (__assign(__assign({}, prev), { dispensedDate: value })); }); }} placeholder="YYYY-MM-DD"/>

            <react_native_1.Text style={{ color: "#35574e", fontWeight: "700", fontSize: 16 }}>복용 시간</react_native_1.Text>
            {timeSlots.map(function (slot, index) { return (<react_native_1.View key={"slot-".concat(index + 1)} style={{
                    borderWidth: 1,
                    borderColor: "#d9e7e2",
                    borderRadius: 18,
                    padding: 12,
                    gap: 10,
                }}>
                <react_native_1.Text style={{ color: "#10332b", fontWeight: "700" }}>{index + 1}회차</react_native_1.Text>
                <ui_1.Field label="시간" value={slot.takeTime} onChangeText={function (value) {
                    return setTimeSlots(function (prev) {
                        return prev.map(function (target, slotIndex) {
                            return slotIndex === index ? __assign(__assign({}, target), { takeTime: value }) : target;
                        });
                    });
                }} placeholder="08:00"/>
                <ui_1.PillSelector options={constants_1.timingOptions} value={slot.timing} onChange={function (value) {
                    return setTimeSlots(function (prev) {
                        return prev.map(function (target, slotIndex) {
                            return slotIndex === index ? __assign(__assign({}, target), { timing: value }) : target;
                        });
                    });
                }}/>
              </react_native_1.View>); })}

            {message ? (<ui_1.InfoBanner text={message} tone={message.includes("실패") ? "danger" : "default"}/>) : null}
            <react_native_1.View style={{ flexDirection: "row", gap: 10 }}>
              <react_native_1.View style={{ flex: 1 }}>
                <ui_1.Button title={editingId ? "수정 저장" : "일정 등록"} onPress={handleSave} loading={loading}/>
              </react_native_1.View>
              <react_native_1.View style={{ flex: 1 }}>
                <ui_1.Button title="초기화" onPress={resetForm} secondary/>
              </react_native_1.View>
            </react_native_1.View>
          </ui_1.SectionCard>)}

        {mode === "calendar" && message ? (<ui_1.InfoBanner text={message} tone={message.includes("실패") ? "danger" : "default"}/>) : null}
      </ui_1.Screen>

      <react_native_1.Modal transparent visible={plusModalVisible} animationType="fade" onRequestClose={function () { return setPlusModalVisible(false); }}>
        <react_native_1.Pressable onPress={function () { return setPlusModalVisible(false); }} style={{
            flex: 1,
            backgroundColor: "rgba(16, 51, 43, 0.28)",
            justifyContent: "center",
            padding: 24,
        }}>
          <react_native_1.Pressable onPress={function () { }} style={{
            borderRadius: 28,
            backgroundColor: "#ffffff",
            padding: 20,
            gap: 16,
        }}>
            <react_native_1.Text style={{ color: "#10332b", fontSize: 20, fontWeight: "800" }}>복약 일정 추가</react_native_1.Text>
            <react_native_1.Text style={{ color: "#547066", lineHeight: 22 }}>
              원하는 방식으로 복약 일정을 등록해 주세요.
            </react_native_1.Text>
            <react_native_1.View style={{ flexDirection: "row", gap: 12 }}>
              <react_native_1.Pressable onPress={function () { }} style={{
            flex: 1,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: "#d9e7e2",
            padding: 16,
            gap: 8,
            backgroundColor: "#fbfdfc",
        }}>
                <vector_icons_1.Ionicons name="document-image-outline" size={28} color="#0f766e"/>
                <react_native_1.Text style={{ color: "#10332b", fontSize: 16, fontWeight: "800" }}>
                  처방전 사진 업로드
                </react_native_1.Text>
                <react_native_1.Text style={{ color: "#547066", lineHeight: 20 }}>
                  준비 중인 기능입니다.
                </react_native_1.Text>
              </react_native_1.Pressable>

              <react_native_1.Pressable onPress={openCreateForm} style={{
            flex: 1,
            borderRadius: 20,
            borderWidth: 1,
            borderColor: "#0f766e",
            padding: 16,
            gap: 8,
            backgroundColor: "#edf7f5",
        }}>
                <vector_icons_1.Ionicons name="create-outline" size={28} color="#0f766e"/>
                <react_native_1.Text style={{ color: "#10332b", fontSize: 16, fontWeight: "800" }}>
                  직접 입력하기
                </react_native_1.Text>
                <react_native_1.Text style={{ color: "#547066", lineHeight: 20 }}>
                  약 이름과 복용 시간을 직접 등록합니다.
                </react_native_1.Text>
              </react_native_1.Pressable>
            </react_native_1.View>

            <ui_1.Button title="닫기" onPress={function () { return setPlusModalVisible(false); }} secondary/>
          </react_native_1.Pressable>
        </react_native_1.Pressable>
      </react_native_1.Modal>
    </>);
}
