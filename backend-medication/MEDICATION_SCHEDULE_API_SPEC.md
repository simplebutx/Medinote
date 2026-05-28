# Medication Schedule API Spec

## Response Models

### MedicationScheduleResponse

```json
{
  "id": 1,
  "userId": 1,
  "medicineId": 12345,
  "customMedicineName": "타이레놀",
  "hospitalName": "나무병원",
  "pharmacyName": "꽃약국",
  "dosageAmount": 1.00,
  "dosageUnit": "TABLET",
  "frequencyType": "DAILY",
  "timesPerDay": 3,
  "intervalHours": null,
  "durationDays": 3,
  "startDate": "2026-05-21",
  "endDate": "2026-05-24",
  "prescribedDate": "2026-05-21",
  "dispensedDate": "2026-05-21",
  "isActive": true,
  "createdAt": "2026-05-21T16:49:48",
  "updatedAt": "2026-05-21T16:53:39",
  "medicines": [
    {
      "id": 10,
      "medicationScheduleId": 1,
      "medicineId": 12345,
      "customMedicineName": "타이레놀",
      "dosageAmount": 1.00,
      "dosageUnit": "TABLET",
      "frequencyType": "DAILY",
      "timesPerDay": 3,
      "intervalHours": null,
      "durationDays": 3,
      "startDate": "2026-05-21",
      "endDate": "2026-05-24",
      "isActive": true,
      "createdAt": "2026-05-21T16:49:48",
      "updatedAt": "2026-05-21T16:53:39"
    }
  ]
}
```

### MedicationScheduleTimeResponse

```json
{
  "id": 100,
  "medicationScheduleId": 1,
  "medicationScheduleMedicineId": 10,
  "timing": "AFTER_MEAL",
  "takeTime": "08:00:00",
  "sortOrder": 1
}
```

### MedicationIntakeLogResponse

```json
{
  "id": 500,
  "medicationScheduleId": 1,
  "medicationScheduleTimeId": 100,
  "status": "TAKEN",
  "scheduledAt": "2026-05-21T08:00:00",
  "takenAt": "2026-05-21T08:03:12",
  "createdAt": "2026-05-21T08:03:12"
}
```

## API List

| 구현여부 | 담당 | 기능 | Method | URL | 권한 | Request | Response | 상태코드 | 연결 화면 | 비고 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 구현 | 승훈 | 복약 일정 목록 조회 | GET | `/api/medication-schedules` | USER | JWT 로그인 사용자 기준 | `MedicationScheduleResponse[]` | `200 OK` | 복약 일정 목록 | 현재는 `@AuthenticationPrincipal userId` 기준 조회 |
| 구현 | 승훈 | 복약 일정 등록 | POST | `/api/medication-schedules` | USER | `medicineId`, `customMedicineName`, `hospitalName`, `pharmacyName`, `dosageAmount`, `dosageUnit`, `frequencyType`, `timesPerDay`, `intervalHours`, `durationDays`, `prescribedDate`, `dispensedDate`, `medicines[]` | `MedicationScheduleResponse` | `201 Created` | 복약 직접 등록 | `userId`는 요청으로 안 받고 로그인 사용자 기준 저장. 다중 약 등록은 `medicines[]` 사용 |
| 구현 | 승훈 | 복약 일정 단건 조회 | GET | `/api/medication-schedules/{id}` | USER | Path: `id` | `MedicationScheduleResponse` | `200 OK` | 복약 일정 수정 | 본인 일정만 조회 가능 |
| 구현 | 승훈 | 복약 일정 수정 | PUT | `/api/medication-schedules/{id}` | USER | Path: `id`, Body: `medicineId`, `customMedicineName`, `hospitalName`, `pharmacyName`, `dosageAmount`, `dosageUnit`, `frequencyType`, `timesPerDay`, `intervalHours`, `durationDays`, `prescribedDate`, `dispensedDate`, `medicines[]` | `MedicationScheduleResponse` | `200 OK` | 복약 일정 수정 | 본인 일정만 수정 가능. 수정 시 약 목록 전체를 다시 보내는 구조 |
| 구현 | 승훈 | 복약 일정 삭제 | DELETE | `/api/medication-schedules/{id}` | USER | Path: `id` | 응답 바디 없음 | `204 No Content` | 복약 일정 | 본인 일정만 삭제 가능 |
| 구현 | 승훈 | 복약 일정 시작/종료 윈도우 초기화 | POST | `/api/medication-schedules/{id}/initialize-window` | USER | Path: `id` | `MedicationScheduleResponse` | `200 OK` | 복약 일정 후처리 | 복용 시간 기준으로 각 약의 `startDate`, `endDate`, `isActive`를 재계산하고 schedule 대표 값도 갱신 |
| 구현 | 승훈 | 복약 시간 목록 조회 | GET | `/api/medication-schedule-times?medicationScheduleId={medicationScheduleId}` | USER | Query: `medicationScheduleId` | `MedicationScheduleTimeResponse[]` | `200 OK` | 복약 일정 상세 | 본인 일정의 시간만 조회 가능. 조회는 schedule 기준, 저장 단위는 scheduleMedicine 기준 |
| 구현 | 승훈 | 복약 시간 등록 | POST | `/api/medication-schedule-times` | USER | `medicationScheduleMedicineId`, `timing`, `takeTime`, `sortOrder` | `MedicationScheduleTimeResponse` | `201 Created` | 복약 일정 상세 | 본인 일정의 특정 약에만 등록 가능 |
| 구현 | 승훈 | 복약 시간 단건 조회 | GET | `/api/medication-schedule-times/{id}` | USER | Path: `id` | `MedicationScheduleTimeResponse` | `200 OK` | 복약 일정 상세 | 본인 일정의 시간만 조회 가능 |
| 구현 | 승훈 | 복약 시간 수정 | PUT | `/api/medication-schedule-times/{id}` | USER | Path: `id`, Body: `medicationScheduleMedicineId`, `timing`, `takeTime`, `sortOrder` | `MedicationScheduleTimeResponse` | `200 OK` | 복약 일정 상세 | 본인 일정의 시간만 수정 가능 |
| 구현 | 승훈 | 복약 시간 삭제 | DELETE | `/api/medication-schedule-times/{id}` | USER | Path: `id` | 응답 바디 없음 | `204 No Content` | 복약 일정 상세 | 본인 일정의 시간만 삭제 가능 |
| 구현 | 승훈 | 복용 기록 등록 | POST | `/api/medication-intake-logs` | USER | `medicationScheduleId`, `medicationScheduleTimeId`, `status`, `scheduledAt`, `takenAt` | `MedicationIntakeLogResponse` | `201 Created` | 오늘 복용 체크 | 인증은 걸려 있지만 서비스 내부 본인 소유 체크는 아직 없음 |
| 구현 | 승훈 | 복용 기록 단건 조회 | GET | `/api/medication-intake-logs/{id}` | USER | Path: `id` | `MedicationIntakeLogResponse` | `200 OK` | 복용 기록 | 인증은 걸려 있지만 서비스 내부 본인 소유 체크는 아직 없음 |
| 구현 | 승훈 | 복용 기록 목록 조회 | GET | `/api/medication-intake-logs?medicationScheduleId={medicationScheduleId}` | USER | Query: `medicationScheduleId` | `MedicationIntakeLogResponse[]` | `200 OK` | 복용 기록 | 현재는 일정별 조회만 지원, 기간 조회 없음, 본인 소유 체크 아직 없음 |
| 구현 | 승훈 | 복용 기록 수정 | PUT | `/api/medication-intake-logs/{id}` | USER | Path: `id`, Body: `medicationScheduleId`, `medicationScheduleTimeId`, `status`, `scheduledAt`, `takenAt` | `MedicationIntakeLogResponse` | `200 OK` | 복용 기록 | 인증은 걸려 있지만 서비스 내부 본인 소유 체크는 아직 없음 |
| 구현 | 승훈 | 복용 기록 삭제 | DELETE | `/api/medication-intake-logs/{id}` | USER | Path: `id` | 응답 바디 없음 | `204 No Content` | 복용 기록 | 인증은 걸려 있지만 서비스 내부 본인 소유 체크는 아직 없음 |

## Request Field Notes

### `POST /api/medication-schedules`, `PUT /api/medication-schedules/{id}`

- 상위 schedule 공통 필드
  - `hospitalName`
  - `pharmacyName`
  - `prescribedDate`
  - `dispensedDate`
- 약별 필드
  - `medicines[].medicineId`
  - `medicines[].customMedicineName`
  - `medicines[].dosageAmount`
  - `medicines[].dosageUnit`
  - `medicines[].frequencyType`
  - `medicines[].timesPerDay`
  - `medicines[].intervalHours`
  - `medicines[].durationDays`

예시:

```json
{
  "hospitalName": "나무병원",
  "pharmacyName": "꽃약국",
  "prescribedDate": "2026-05-21",
  "dispensedDate": "2026-05-21",
  "medicines": [
    {
      "medicineId": 12345,
      "customMedicineName": "타이레놀",
      "dosageAmount": 1.00,
      "dosageUnit": "TABLET",
      "frequencyType": "DAILY",
      "timesPerDay": 3,
      "intervalHours": null,
      "durationDays": 3
    },
    {
      "medicineId": null,
      "customMedicineName": "비타민C",
      "dosageAmount": 1.00,
      "dosageUnit": "TABLET",
      "frequencyType": "DAILY",
      "timesPerDay": 2,
      "intervalHours": null,
      "durationDays": 7
    }
  ]
}
```

### `POST /api/medication-schedule-times`, `PUT /api/medication-schedule-times/{id}`

- `medicationScheduleMedicineId` 기준으로 시간 등록
- 시간은 schedule이 아니라 schedule 안의 개별 medicine에 귀속됨

예시:

```json
{
  "medicationScheduleMedicineId": 10,
  "timing": "AFTER_MEAL",
  "takeTime": "08:00:00",
  "sortOrder": 1
}
```
