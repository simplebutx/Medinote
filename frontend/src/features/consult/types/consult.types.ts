export type ConsultRoomStatus =
  | 'PENDING'
  | 'MATCHED'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'CLOSED';

export interface ConsultRoom {
  roomId: number;
  customId?: number;
  customerId?: number;
  pharmacistId?: number | null;
  status: ConsultRoomStatus;
  createdAt: string;
  firstMessage?: string;
  customerName?: string;

  aiConsultationSummary?: string | null;
  rating?: number | null;
  feedbackComment?: string | null;

  comment?: string;
}

export type ConsultMessageSenderType = 'USER' | 'PHARMACIST';

export interface ConsultMessage {
  messageId?: number;
  type?: 'ENTER' | 'TALK';
  roomId?: number;
  senderId: number;
  senderType: ConsultMessageSenderType;
  message?: string;
  content?: string;
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

export type ConsultSocketMessageType = 'ENTER' | 'TALK';

export interface ConsultSocketMessage {
  type: ConsultSocketMessageType;
  roomId: number;
  senderId: number;
  senderType: ConsultMessageSenderType;
  senderName?: string;
  message: string;
}

export interface SubmitConsultFeedbackRequest {
  rating: number;
  comment?: string;
  pharmacistId: number;
}
