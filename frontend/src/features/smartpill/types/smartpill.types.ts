export interface SmartPillSlotState {
  slotNumber: number;
  muxPort?: number | null;
  sensorReady?: boolean | null;
  distanceMm?: number | null;
  pillPresent?: boolean | null;
}

export interface SmartPillStatusResponse {
  message?: string | null;
  deviceId?: string | null;
  eventType?: string | null;
  muxPort?: number | null;
  distanceMm?: number | null;
  pillPresent?: boolean | null;
  buttonClickCount?: number | null;
  slots?: SmartPillSlotState[] | null;
  uptimeMs?: number | null;
  sequence?: number | null;
  receivedAt?: string | null;
}

export interface SmartPillIntakeEventRequest {
  deviceId: string;
  eventType?: string | null;
  muxPort?: number | null;
  distanceMm?: number | null;
  pillPresent?: boolean | null;
  buttonClickCount?: number | null;
  slots?: SmartPillSlotState[] | null;
  uptimeMs?: number | null;
  sequence?: number | null;
}

export type SmartPillIntakeEventResponse = SmartPillStatusResponse;

export interface SmartPillDevice {
  id: number;
  deviceId: string;
  name?: string | null;
  activeDetection?: boolean | null;
  detectionStartedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface SmartPillSlotScheduleTime {
  medicationScheduleTimeId: number;
  medicationScheduleMedicineId?: number | null;
  medicineName?: string | null;
  takeTime?: string | null;
}

export interface SmartPillSlotAssignment {
  slotNumber: number;
  takeTime?: string | null;
  scheduleTimes?: SmartPillSlotScheduleTime[] | null;
}

export interface SmartPillSlotAssignmentResponse {
  deviceId: string;
  name?: string | null;
  activeDetection?: boolean | null;
  detectionStartedAt?: string | null;
  slots?: SmartPillSlotAssignment[] | null;
}

export interface SmartPillSlotSaveRequest {
  slotNumber: number;
  medicationScheduleTimeIds: number[];
}

export interface SaveSmartPillSlotAssignmentsRequest {
  name: string;
  slots: SmartPillSlotSaveRequest[];
}
