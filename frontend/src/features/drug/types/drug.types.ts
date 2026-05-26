export interface MedicineSearchItem {
  itemSeq?: number;
  item_seq?: number;
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
}

export type MedicineSuggestResponse = string[];