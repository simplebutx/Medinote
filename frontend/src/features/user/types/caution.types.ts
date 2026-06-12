export type CautionTargetType = "MEDICINE" | "INGREDIENT";

export type CautionReason =
  | "ALLERGY"
  | "SIDE_EFFECT"
  | "DOCTOR_ADVICE"
  | "PHARMACIST_ADVICE"
  | "PERSONAL_AVOID"
  | "OTHER";

export interface CautionItem {
  id: number;
  userId: number;
  itemSeq?: number | null;
  itemName?: string | null;
  ingredientCode?: string | null;
  ingredientName?: string | null;
  reason: CautionReason;
  cautionType?: CautionTargetType | null;
  memo?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CautionRequest {
  itemSeq?: number | null;
  itemName?: string | null;
  ingredientCode?: string | null;
  ingredientName?: string | null;
  reason: CautionReason;
  cautionType: CautionTargetType;
  memo?: string | null;
}

export interface CautionSuggestItem {
  name: string;
  type: CautionTargetType;
}
