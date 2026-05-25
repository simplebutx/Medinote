"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.trimText = trimText;
exports.formatScheduleLabel = formatScheduleLabel;
exports.todayDateInput = todayDateInput;
function trimText(text) {
    if (!text) {
        return "-";
    }
    var normalized = text.replace(/\s+/g, " ").trim();
    return normalized || "-";
}
function formatScheduleLabel(schedule) {
    var _a, _b, _c;
    var name = schedule.customMedicineName || "\uC57D #".concat((_a = schedule.medicineId) !== null && _a !== void 0 ? _a : "-");
    var amount = schedule.dosageAmount
        ? "".concat(schedule.dosageAmount).concat((_b = schedule.dosageUnit) !== null && _b !== void 0 ? _b : "")
        : "-";
    return "".concat(name, " \u00B7 \uD558\uB8E8 ").concat((_c = schedule.timesPerDay) !== null && _c !== void 0 ? _c : 0, "\uD68C \u00B7 ").concat(amount);
}
function todayDateInput() {
    return new Date().toISOString().slice(0, 10);
}
