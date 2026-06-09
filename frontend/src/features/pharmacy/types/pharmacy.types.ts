export interface Pharmacy {
  hpid: string;
  name?: string | null;
  pharmacyName?: string | null;
  address?: string | null;
  phone?: string | null;
  latitude?: number | null;
  longitude?: number | null;

  mondayOpen?: string | null;
  mondayClose?: string | null;
  tuesdayOpen?: string | null;
  tuesdayClose?: string | null;
  wednesdayOpen?: string | null;
  wednesdayClose?: string | null;
  thursdayOpen?: string | null;
  thursdayClose?: string | null;
  fridayOpen?: string | null;
  fridayClose?: string | null;
  saturdayOpen?: string | null;
  saturdayClose?: string | null;
  sundayOpen?: string | null;
  sundayClose?: string | null;
  holidayOpen?: string | null;
  holidayClose?: string | null;

  description?: string | null;
  extraInfo?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface PharmacyRegisterRequest {
  address: string;
  phone: string;
  latitude: number;
  longitude: number;
  pharmacyName: string;
  mondayOpen: string;
  mondayClose: string;
  tuesdayOpen: string;
  tuesdayClose: string;
  wednesdayOpen: string;
  wednesdayClose: string;
  thursdayOpen: string;
  thursdayClose: string;
  fridayOpen: string;
  fridayClose: string;
  saturdayOpen: string;
  saturdayClose: string;
  sundayOpen: string;
  sundayClose: string;
  holidayOpen: string;
  holidayClose: string;
}

export interface PharmacyInventory {
  id: number;
  pharmacistId?: number;
  pharmacyHpid: string;
  itemSeq: string;
  itemName: string;
  companyName?: string | null;
  stockQuantity: number;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface PharmacyInventoryRequest {
  pharmacyHpid: string;
  itemSeq: string;
  itemName: string;
  companyName?: string;
  stockQuantity: number;
}