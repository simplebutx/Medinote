export type UserGender = 'MALE' | 'FEMALE';

export type UserRole = 'USER' | 'PHARMACIST' | 'ADMIN';

export type UserDisease =
  | string
  | {
      diseaseCode?: string | null;
      disease_code?: string | null;
      diseaseName?: string | null;
      disease_name?: string | null;
      name?: string | null;
    };

export interface UserProfile {
  id?: number | string | null;
  userId?: number | string | null;
  user_id?: number | string | null;

  email?: string | null;
  username?: string | null;
  name?: string | null;

  birthDate?: string | null;
  birth_date?: string | null;
  gender?: UserGender | string | null;
  role?: UserRole | string | null;
  status?: string | null;

  createdAt?: string | null;
  created_at?: string | null;
  updatedAt?: string | null;
  updated_at?: string | null;

  isPregnant?: boolean | null;
  is_pregnant?: boolean | null;
  isBreastfeeding?: boolean | null;
  is_breastfeeding?: boolean | null;
  isSmoking?: boolean | null;
  is_smoking?: boolean | null;
  isDrinking?: boolean | null;
  is_drinking?: boolean | null;

  diseases?: UserDisease[];
  chronicDiseases?: UserDisease[];

  docNumber?: string | null;
  licenseNumber?: string | null;
  licenseImage?: string | null;
}

export interface UpdateMyProfileRequest {
  username?: string;
  birthDate?: string;
  gender?: UserGender;
  isPregnant?: boolean;
  isBreastfeeding?: boolean;
  isSmoking?: boolean;
  isDrinking?: boolean;
  diseases?: string[];
}

export interface UpdateMyPharmacistProfileRequest {
  docNumber: string;
  licenseNumber: string;
  licenseImage?: File | null;
}