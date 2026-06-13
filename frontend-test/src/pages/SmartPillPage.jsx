import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  getAuthSession,
  getSmartPillSlotAssignments,
  getSmartPillStatus,
  pauseSmartPillDetection,
  resetSmartPillConnection,
  startSmartPillDetection,
} from '../api'

const DEFAULT_DEVICE_ID = 'smartpill-prototype-1'

const DEFAULT_SLOTS = [
  { slotNumber: 1, muxPort: 3, sensorReady: false, distanceMm: null, pillPresent: false },
  { slotNumber: 2, muxPort: 4, sensorReady: false, distanceMm: null, pillPresent: false },
  { slotNumber: 3, muxPort: 6, sensorReady: false, distanceMm: null, pillPresent: false },
  { slotNumber: 4, muxPort: 7, sensorReady: false, distanceMm: null, pillPresent: false },
]

function formatDistance(distanceMm) {
  return Number.isFinite(distanceMm) && distanceMm >= 0 ? `${distanceMm} mm` : '-- mm'
}

function formatReceivedAt(receivedAt) {
  if (!receivedAt) return '수신 대기'

  const date = new Date(receivedAt)
  if (Number.isNaN(date.getTime())) return receivedAt

  return new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date)
}

function formatTakeTime(takeTime) {
  if (!takeTime) return '시간 미설정'
  return String(takeTime).slice(0, 5)
}

function getAssignedMedicineNames(assignment) {
  return (assignment?.scheduleTimes || [])
    .map((scheduleTime) => scheduleTime.medicineName || `약 #${scheduleTime.medicationScheduleMedicineId}`)
    .filter(Boolean)
}

function SmartPillPage() {
  const [status, setStatus] = useState(null)
  const [assignment, setAssignment] = useState(null)
  const [loading, setLoading] = useState(true)
  const [detectionSaving, setDetectionSaving] = useState(false)
  const [resetSaving, setResetSaving] = useState(false)
  const [hasSeenPillAfterStart, setHasSeenPillAfterStart] = useState(false)
  const [dismissedEmptyCycleKey, setDismissedEmptyCycleKey] = useState('')
  const [error, setError] = useState('')
  const [assignmentMessage, setAssignmentMessage] = useState('')

  const loadStatus = useCallback(async () => {
    try {
      const data = await getSmartPillStatus()
      setStatus(data)
      setError('')
    } catch (err) {
      setError(err.response?.data?.message || err.message || '스마트 약통 상태를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadAssignment = useCallback(async () => {
    const session = getAuthSession()

    if (!session?.accessToken) {
      setAssignment(null)
      setAssignmentMessage('로그인하면 연결된 처방전 약 이름을 볼 수 있습니다.')
      return
    }

    try {
      const data = await getSmartPillSlotAssignments(DEFAULT_DEVICE_ID)
      setAssignment(data)
      setAssignmentMessage('')
    } catch (err) {
      setAssignment(null)

      if (err.response?.status === 404) {
        setAssignmentMessage('아직 스마트 약통에 연결된 처방전이 없습니다.')
        return
      }

      setAssignmentMessage(err.response?.data?.message || '스마트 약통 연결 정보를 불러오지 못했습니다.')
    }
  }, [])

  const refreshAll = useCallback(() => {
    loadStatus()
    loadAssignment()
  }, [loadAssignment, loadStatus])

  const handleToggleDetection = async () => {
    const session = getAuthSession()

    if (!session?.accessToken) {
      setAssignmentMessage('로그인해야 측정을 시작할 수 있습니다.')
      return
    }

    setDetectionSaving(true)
    setAssignmentMessage('')

    try {
      const nextAssignment = assignment?.activeDetection
        ? await pauseSmartPillDetection(DEFAULT_DEVICE_ID)
        : await startSmartPillDetection(DEFAULT_DEVICE_ID)
      setAssignment(nextAssignment)
      setHasSeenPillAfterStart(false)
      setDismissedEmptyCycleKey('')
    } catch (err) {
      setAssignmentMessage(err.response?.data?.message || err.message || '측정 상태를 변경하지 못했습니다.')
    } finally {
      setDetectionSaving(false)
    }
  }

  const handleResetConnection = useCallback(async () => {
    const session = getAuthSession()

    if (!session?.accessToken) {
      setAssignmentMessage('로그인해야 스마트 약통 연결을 초기화할 수 있습니다.')
      return
    }

    setResetSaving(true)
    setAssignmentMessage('')

    try {
      const nextAssignment = await resetSmartPillConnection(DEFAULT_DEVICE_ID)
      setAssignment(nextAssignment)
      setHasSeenPillAfterStart(false)
      setDismissedEmptyCycleKey('')
      setAssignmentMessage('스마트 약통 연결을 초기화했습니다. 다음 처방전을 다시 연결해 주세요.')
    } catch (err) {
      setAssignmentMessage(err.response?.data?.message || err.message || '스마트 약통 연결을 초기화하지 못했습니다.')
    } finally {
      setResetSaving(false)
    }
  }, [])

  useEffect(() => {
    refreshAll()
    const timer = window.setInterval(loadStatus, 2000)

    return () => window.clearInterval(timer)
  }, [loadStatus, refreshAll])

  const assignmentsBySlot = useMemo(() => {
    return new Map((assignment?.slots || []).map((slot) => [slot.slotNumber, slot]))
  }, [assignment])

  const slots = useMemo(() => {
    const bySlot = new Map((status?.slots || []).map((slot) => [slot.slotNumber, slot]))
    return DEFAULT_SLOTS.map((fallback) => ({
      ...fallback,
      ...bySlot.get(fallback.slotNumber),
      assignment: assignmentsBySlot.get(fallback.slotNumber) || null,
    }))
  }, [assignmentsBySlot, status])

  const connectedSlots = useMemo(() => {
    return slots.filter((slot) => getAssignedMedicineNames(slot.assignment).length > 0)
  }, [slots])

  const connectedSlotCount = connectedSlots.length
  const canControlDetection = Boolean(assignment && connectedSlotCount > 0)

  useEffect(() => {
    if (!assignment?.activeDetection) {
      setHasSeenPillAfterStart(false)
      setDismissedEmptyCycleKey('')
      return
    }

    if (connectedSlots.some((slot) => Boolean(slot.pillPresent))) {
      setHasSeenPillAfterStart(true)
      setDismissedEmptyCycleKey('')
    }
  }, [assignment?.activeDetection, connectedSlots])

  useEffect(() => {
    if (!assignment?.activeDetection || resetSaving || !hasSeenPillAfterStart || connectedSlots.length === 0) {
      return
    }

    const allConnectedSlotsEmpty = connectedSlots.every((slot) => !slot.pillPresent)
    const emptyCycleKey = connectedSlots
      .map((slot) => `${slot.slotNumber}:${slot.pillPresent ? 'O' : 'X'}`)
      .join('|')

    if (!allConnectedSlotsEmpty || dismissedEmptyCycleKey === emptyCycleKey) {
      return
    }

    const shouldReset = window.confirm('연결된 약칸이 모두 비었습니다. 복약이 끝났다면 스마트 약통 연결을 초기화할까요?')

    if (shouldReset) {
      handleResetConnection()
    } else {
      setDismissedEmptyCycleKey(emptyCycleKey)
    }
  }, [
    assignment?.activeDetection,
    connectedSlots,
    dismissedEmptyCycleKey,
    handleResetConnection,
    hasSeenPillAfterStart,
    resetSaving,
  ])

  const buttonClickCount = status?.buttonClickCount ?? 0
  const receivedAt = formatReceivedAt(status?.receivedAt)
  const lastEvent = status?.eventType || '대기'

  return (
    <div className="app-page smartpill-page">
      <div className="app-page-header smartpill-page-header">
        <div>
          <p className="app-page-eyebrow">Smart Pillbox</p>
          <h1 className="app-page-title">스마트 약통</h1>
          <p className="app-page-description">4개 칸의 센서 상태와 연결된 처방전 약을 확인합니다.</p>
        </div>
        <button className="smartpill-refresh-button" type="button" onClick={refreshAll} disabled={loading}>
          새로고침
        </button>
      </div>

      <section className="smartpill-summary-grid">
        <div className="smartpill-summary-card">
          <span>버튼 횟수</span>
          <strong>{buttonClickCount}</strong>
        </div>
        <div className="smartpill-summary-card">
          <span>마지막 이벤트</span>
          <strong>{lastEvent}</strong>
        </div>
        <div className="smartpill-summary-card">
          <span>마지막 수신</span>
          <strong>{receivedAt}</strong>
        </div>
      </section>

      <section className="smartpill-connection-panel">
        <div>
          <span>연결된 약통</span>
          <strong>{assignment?.name || DEFAULT_DEVICE_ID}</strong>
        </div>
        <div>
          <span>처방전 연결 칸</span>
          <strong>{connectedSlotCount} / 4</strong>
        </div>
        <div>
          <span>자동 복약 감지</span>
          <strong>{assignment?.activeDetection ? '측정 중' : '대기 중'}</strong>
        </div>
        <button
          type="button"
          className={assignment?.activeDetection ? 'smartpill-detection-button secondary' : 'smartpill-detection-button'}
          onClick={handleToggleDetection}
          disabled={!canControlDetection || detectionSaving || resetSaving}
        >
          {assignment?.activeDetection ? '측정 중지' : '측정 시작'}
        </button>
        <button
          type="button"
          className="smartpill-detection-button danger"
          onClick={handleResetConnection}
          disabled={!canControlDetection || detectionSaving || resetSaving}
        >
          연결 초기화
        </button>
        {assignmentMessage ? <p>{assignmentMessage}</p> : null}
      </section>

      {error && <p className="smartpill-error">{error}</p>}

      <section className="smartpill-slot-grid" aria-label="스마트 약통 칸 상태">
        {slots.map((slot) => {
          const pillPresent = Boolean(slot.pillPresent)
          const ready = Boolean(slot.sensorReady)
          const assignedNames = getAssignedMedicineNames(slot.assignment)

          return (
            <article
              className={`smartpill-slot-card ${pillPresent ? 'smartpill-slot-card-present' : 'smartpill-slot-card-empty'}`}
              key={slot.slotNumber}
            >
              <div className="smartpill-slot-top">
                <span>{slot.slotNumber}번 칸</span>
                <small>PORT {slot.muxPort}</small>
              </div>

              <div className="smartpill-slot-assignment">
                <span>{formatTakeTime(slot.assignment?.takeTime)}</span>
                {assignedNames.length ? (
                  <ul>
                    {assignedNames.map((name, index) => (
                      <li key={`${slot.slotNumber}-${name}-${index}`}>{name}</li>
                    ))}
                  </ul>
                ) : (
                  <p>연결 없음</p>
                )}
              </div>

              <strong className="smartpill-slot-mark">{pillPresent ? 'O' : 'X'}</strong>

              <dl className="smartpill-slot-details">
                <div>
                  <dt>거리</dt>
                  <dd>{formatDistance(slot.distanceMm)}</dd>
                </div>
                <div>
                  <dt>상태</dt>
                  <dd>{ready ? (pillPresent ? '약 있음' : '비어 있음') : '센서 대기'}</dd>
                </div>
              </dl>
            </article>
          )
        })}
      </section>
    </div>
  )
}

export default SmartPillPage
