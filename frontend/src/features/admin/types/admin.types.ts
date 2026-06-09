export type AdminUserRole = 'USER' | 'PHARMACIST' | 'ADMIN';

export type AdminUserStatus =
  | 'ACTIVE'
  | 'WAITING_APPROVAL'
  | 'PENDING'
  | 'REJECTED';

export type AdminUserGender = 'MALE' | 'FEMALE';

export interface AdminStats {
  totalUserCount: number;
  totalPharmacistCount: number;
  pendingPharmacistCount: number;
}

export interface PendingPharmacist {
  userId: number;
  email: string;
  username: string;
  docNumber?: string | null;
  licenseNumber?: string | null;
  licenseImage?: string | null;
}

export interface AdminUser {
  id: number;
  email: string;
  username: string;
  birthDate?: string | null;
  gender?: AdminUserGender | string | null;
  role: AdminUserRole | string;
  status: AdminUserStatus | string;
  createdAt?: string | null;

  isPregnant?: boolean | null;
  isBreastfeeding?: boolean | null;
  isSmoking?: boolean | null;
  isDrinking?: boolean | null;
  chronicDiseases?: string[];

  docNumber?: string | null;
  licenseNumber?: string | null;
  licenseImage?: string | null;
}

export interface MedicineSyncStatus {
  checkedCount?: number;
  insertedCount?: number;
  updatedCount?: number;
  syncedIngredientItemCount?: number;
  lastSyncedPublicUpdateDe?: string | null;
  latestPublicUpdateDe?: string | null;
  requestedDateCount?: number;
  savedIngredientRowCount?: number;
  message?: string | null;
}

export interface MedicineSyncResult {
  checkedCount?: number;
  insertedCount?: number;
  updatedCount?: number;
  syncedIngredientItemCount?: number;
  lastSyncedPublicUpdateDe?: string | null;
  latestPublicUpdateDe?: string | null;
  requestedDateCount?: number;
  savedIngredientRowCount?: number;
  message?: string | null;
}