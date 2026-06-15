export interface MedicineGeneralCautionTag {
  tagCode?: string | null;
  tag_code?: string | null;
  tagName?: string | null;
  tag_name?: string | null;
  matchedKeywords?: string[] | null;
  matched_keywords?: string[] | null;
}

export interface MedicineSearchItem {
  itemSeq?: number | string;
  item_seq?: number | string;
  itemName?: string;
  item_name?: string;
  companyName?: string;
  company_name?: string;
  efficacy?: string;
  useMethod?: string;
  use_method?: string;
  warningBeforeUse?: string;
  warning_before_use?: string;
  caution?: string;
  interaction?: string;
  sideEffect?: string;
  side_effect?: string;
  storageMethod?: string;
  storage_method?: string;
  updateDe?: string;
  update_de?: string;
  imageUrl?: string;
  image_url?: string;
  warningMedicine?: boolean;
  warning_medicine?: boolean;
  warningIngredient?: boolean;
  warning_ingredient?: boolean;
  generalCautionTags?: MedicineGeneralCautionTag[] | null;
  general_caution_tags?: MedicineGeneralCautionTag[] | null;
  medicineName?: string | null;
  drugName?: string | null;
  entpName?: string | null;
  entp_name?: string | null;
}

export type MedicineSuggestResponse = string[];
