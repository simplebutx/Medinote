export type ConsultRoomStatus = 'PENDING' | 'ACTIVE' | 'COMPLETED';

export interface ConsultRoom {
  roomId: number;
  customId?: number;
  customerId?: number;
  pharmacistId?: number;
  status: ConsultRoomStatus;
  createdAt: string;
  firstMessage?: string;
  customerName?: string;
  rating?: number;
  comment?: string;
}

export type ConsultMessageSenderType = 'USER' | 'PHARMACIST';

export interface ConsultMessage {
  type?: 'ENTER' | 'TALK';
  roomId: number;
  senderId: number;
  senderType: ConsultMessageSenderType;
  message: string;
  createdAt?: string;
}

export interface ConsultPatientInfo {
  userId?: number;
  customerId?: number;
  username?: string;
  customerName?: string;
  email?: string;
  birthDate?: string;
  gender?: string;
  isPregnant?: boolean;
  isBreastfeeding?: boolean;
  isSmoking?: boolean;
  isDrinking?: boolean;
  isChild?: boolean;
  isElderly?: boolean;
  chronicDiseases?: string[];
  medicationSchedules?: unknown[];
}

export interface ConsultFeedbackStats {
  averageRating?: number;
  reviewCount?: number;
  totalCount?: number;
}