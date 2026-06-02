export type UserGender = 'MALE' | 'FEMALE';

export type UserRole = 'USER' | 'PHARMACIST' | 'ADMIN';

export interface UserDisease {
  diseaseCode?: string | null;
  disease_code?: string | null;
  diseaseName?: string | null;
  disease_name?: string | null;
}

export interface UserProfile {
  id?: number;
  userId?: number;

  email?: string | null;
  username?: string | null;
  name?: string | null;

  birthDate?: string | null;
  birth_date?: string | null;
  gender?: UserGender | string | null;
  role?: UserRole | string | null;

  isPregnant?: boolean | null;
  is_pregnant?: boolean | null;
  isBreastfeeding?: boolean | null;
  is_breastfeeding?: boolean | null;
  isSmoking?: boolean | null;
  is_smoking?: boolean | null;
  isDrinking?: boolean | null;
  is_drinking?: boolean | null;

  diseases?: UserDisease[];
}