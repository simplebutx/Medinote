import type { CautionReason, DosageUnit, MedicationTiming } from "./types";

const gatewayUrl = process.env.EXPO_PUBLIC_API_BASE_URL || "";
const defaultHost = process.env.EXPO_PUBLIC_DEFAULT_API_HOST || "localhost";

const serviceUrl = (name: string, fallbackPort: number) =>
  process.env[name] || (gatewayUrl ? gatewayUrl : `http://${defaultHost}:${fallbackPort}`);

export const AUTH_BASE_URL = serviceUrl("EXPO_PUBLIC_AUTH_API_URL", 8080);
export const MEDICATION_BASE_URL = serviceUrl("EXPO_PUBLIC_MEDICATION_API_URL", 8081);
export const CONSULTATION_BASE_URL = serviceUrl("EXPO_PUBLIC_CONSULTATION_API_URL", 8082);
export const AI_BASE_URL = serviceUrl("EXPO_PUBLIC_AI_API_URL", 8000);

export const brand = {
  name: "MediNote",
  tagline: "복약 일정, 약 검색, 상담을 한 곳에서",
};

export const colors = {
  bg: "#F5F7FA",
  surface: "#FFFFFF",
  surfaceAlt: "#EEF7F4",
  primary: "#0F766E",
  primaryDark: "#115E59",
  accent: "#2563EB",
  danger: "#DC2626",
  warning: "#D97706",
  text: "#172033",
  muted: "#64748B",
  border: "#DCE5EA",
  chip: "#E8F4F1",
};

export const spacing = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
};

export const timingOptions: Array<{ value: MedicationTiming; label: string }> = [
  { value: "AFTER_MEAL", label: "식후" },
  { value: "BEFORE_MEAL", label: "식전" },
  { value: "WITH_MEAL", label: "식사 중" },
  { value: "EMPTY_STOMACH", label: "공복" },
  { value: "BEDTIME", label: "취침 전" },
  { value: "ANYTIME", label: "상관 없음" },
];

export const dosageUnitOptions: Array<{ value: DosageUnit; label: string }> = [
  { value: "TABLET", label: "정" },
  { value: "CAPSULE", label: "캡슐" },
  { value: "PACK", label: "포" },
  { value: "ML", label: "mL" },
  { value: "MG", label: "mg" },
  { value: "DROP", label: "방울" },
  { value: "OTHER", label: "기타" },
];

export const cautionReasonOptions: Array<{ value: CautionReason; label: string }> = [
  { value: "ALLERGY", label: "알레르기" },
  { value: "SIDE_EFFECT", label: "부작용" },
  { value: "DOCTOR_ADVICE", label: "의사 권고" },
  { value: "PHARMACIST_ADVICE", label: "약사 권고" },
  { value: "PERSONAL_AVOID", label: "개인 회피" },
  { value: "OTHER", label: "기타" },
];

export const defaultBounds = {
  southLat: 37.45,
  northLat: 37.62,
  westLng: 126.83,
  eastLng: 127.12,
};
