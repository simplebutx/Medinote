"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.timingOptions = exports.dosageUnitOptions = exports.reasonOptions = exports.DEFAULT_API_HOST = void 0;
exports.DEFAULT_API_HOST = process.env.EXPO_PUBLIC_DEFAULT_API_HOST || "192.168.45.19";
exports.reasonOptions = [
    { value: "ALLERGY", label: "알러지" },
    { value: "SIDE_EFFECT", label: "부작용" },
    { value: "DOCTOR_ADVICE", label: "의사 권고" },
    { value: "PHARMACIST_ADVICE", label: "약사 권고" },
    { value: "PERSONAL_AVOID", label: "개인 사유" },
    { value: "OTHER", label: "기타" },
];
exports.dosageUnitOptions = [
    { value: "TABLET", label: "정" },
    { value: "ML", label: "mL" },
    { value: "MG", label: "mg" },
    { value: "PACKET", label: "포" },
    { value: "SPOON", label: "스푼" },
];
exports.timingOptions = [
    { value: "AFTER_MEAL", label: "식후" },
    { value: "BEFORE_MEAL", label: "식전" },
    { value: "WITH_MEAL", label: "식사 중" },
    { value: "EMPTY_STOMACH", label: "공복" },
    { value: "BEDTIME", label: "취침 전" },
    { value: "ANYTIME", label: "상관 없음" },
];
