import { useMemo, useState } from 'react'
import {
  createMedicationSchedule,
  createMedicationScheduleTime,
  getMedicationSchedules,
} from '../api'

const DEFAULT_USER_ID = 1
const MAX_TIMES_PER_DAY = 12

function createTimeSlot(index) {
  return {
    takeTime: '',
    timing: 'AFTER_MEAL',
    sortOrder: index + 1,
  }
}

function formatJson(value) {
  return JSON.stringify(value, null, 2)
}

function syncTimeSlots(previousSlots, nextCount) {
  return Array.from({ length: nextCount }, (_, index) => ({
    ...(previousSlots[index] || createTimeSlot(index)),
    sortOrder: index + 1,
  }))
}

function toScheduleCardLabel(schedule) {
  const medicineName = schedule.customMedicineName || `약 ID ${schedule.medicineId}`
  const amount = schedule.dosageAmount ? `${schedule.dosageAmount}${schedule.dosageUnit || ''}` : '-'
  return `${medicineName} · 하루 ${schedule.timesPerDay || 0}회 · ${amount}`
}

function ScheduleTest() {
  const [message, setMessage] = useState('')
  const [createdSchedule, setCreatedSchedule] = useState(null)
  const [createdTimes, setCreatedTimes] = useState([])
  const [scheduleList, setScheduleList] = useState([])

  const [form, setForm] = useState({
    customMedicineName: '타이레놀',
    dosageAmount: '1',
    dosageUnit: 'TABLET',
    timesPerDay: '3',
    startDate: '2026-05-20',
    endDate: '2026-05-27',
  })

  const [timeSlots, setTimeSlots] = useState([
    { takeTime: '08:00', timing: 'AFTER_MEAL', sortOrder: 1 },
    { takeTime: '13:00', timing: 'AFTER_MEAL', sortOrder: 2 },
    { takeTime: '20:00', timing: 'AFTER_MEAL', sortOrder: 3 },
  ])

  const timesPerDay = useMemo(() => {
    const parsed = Number(form.timesPerDay)
    if (!Number.isFinite(parsed) || parsed < 1) {
      return 1
    }
    return Math.min(parsed, MAX_TIMES_PER_DAY)
  }, [form.timesPerDay])

  const handleFormChange = (event) => {
    const { name, value } = event.target

    if (name === 'timesPerDay') {
      const numericValue = value === '' ? '' : String(Math.min(Math.max(Number(value), 1), MAX_TIMES_PER_DAY))
      setForm((prev) => ({ ...prev, [name]: numericValue }))
      if (numericValue !== '') {
        setTimeSlots((prev) => syncTimeSlots(prev, Number(numericValue)))
      }
      return
    }

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleTimeSlotChange = (index, field, value) => {
    setTimeSlots((prev) =>
      prev.map((slot, slotIndex) =>
        slotIndex === index
          ? {
              ...slot,
              [field]: value,
            }
          : slot,
      ),
    )
  }

  const handleCreateSchedule = async () => {
    try {
      const payload = {
        userId: DEFAULT_USER_ID,
        medicineId: null,
        customMedicineName: form.customMedicineName || null,
        dosageAmount: form.dosageAmount ? Number(form.dosageAmount) : null,
        dosageUnit: form.dosageUnit || null,
        frequencyType: 'DAILY',
        timesPerDay,
        intervalHours: null,
        startDate: form.startDate,
        endDate: form.endDate,
        isActive: true,
      }

      const schedule = await createMedicationSchedule(payload)

      const timeResponses = []
      for (const [index, slot] of timeSlots.entries()) {
        const createdTime = await createMedicationScheduleTime({
          medicationScheduleId: schedule.id,
          timing: slot.timing,
          takeTime: slot.takeTime,
          sortOrder: index + 1,
        })
        timeResponses.push(createdTime)
      }

      setCreatedSchedule(schedule)
      setCreatedTimes(timeResponses)
      setMessage('복약 일정과 시간 정보가 함께 저장됐습니다.')
    } catch (error) {
      setMessage(error.response?.data?.message || error.message || '복약 일정 저장에 실패했습니다.')
    }
  }

  const handleLoadSchedules = async () => {
    try {
      const data = await getMedicationSchedules(DEFAULT_USER_ID)
      setScheduleList(data)
      setMessage('현재 사용자의 복약 일정을 불러왔습니다.')
    } catch (error) {
      setMessage(error.response?.data?.message || error.message || '복약 일정 조회에 실패했습니다.')
    }
  }

  return (
    <div className="schedule-page">
      <section className="schedule-hero">
        <div>
          <p className="schedule-eyebrow">Medication Flow</p>
          <h1>복약 일정 만들기</h1>
          <p className="schedule-subtitle">
            사용자가 처방전을 보면서 약 이름, 복용량, 하루 복용 횟수, 각 회차별 시간을 직접 입력하는
            실제 화면 흐름에 맞춘 테스트 페이지입니다.
          </p>
        </div>
        <div className="schedule-status-card">
          <span className="schedule-status-label">현재 테스트 사용자</span>
          <strong>USER #{DEFAULT_USER_ID}</strong>
          <strong>회차 최대 {MAX_TIMES_PER_DAY}개</strong>
        </div>
      </section>

      {message && <div className="schedule-banner">{message}</div>}

      <div className="schedule-grid">
        <section className="schedule-card schedule-card-wide">
          <div className="schedule-card-header">
            <h2>일정 입력</h2>
            <p>내부 ID나 주기 타입은 숨기고, 사용자에게 필요한 정보만 직접 받습니다.</p>
          </div>

          <div className="schedule-form-grid">
            <label className="schedule-col-span-2">
              약 이름
              <input
                name="customMedicineName"
                value={form.customMedicineName}
                onChange={handleFormChange}
                placeholder="예: 타이레놀"
              />
            </label>

            <label>
              1회 복용량
              <input
                name="dosageAmount"
                type="number"
                min="0"
                step="0.5"
                value={form.dosageAmount}
                onChange={handleFormChange}
              />
            </label>

            <label>
              단위
              <select name="dosageUnit" value={form.dosageUnit} onChange={handleFormChange}>
                <option value="TABLET">정</option>
                <option value="ML">ml</option>
                <option value="MG">mg</option>
                <option value="PACKET">포</option>
                <option value="SPOON">스푼</option>
              </select>
            </label>

            <label>
              하루 복용 횟수
              <input
                name="timesPerDay"
                type="number"
                min="1"
                max={MAX_TIMES_PER_DAY}
                value={form.timesPerDay}
                onChange={handleFormChange}
              />
            </label>

            <label>
              시작일
              <input type="date" name="startDate" value={form.startDate} onChange={handleFormChange} />
            </label>

            <label>
              종료일
              <input type="date" name="endDate" value={form.endDate} onChange={handleFormChange} />
            </label>
          </div>

          <div className="schedule-time-block">
            <div className="schedule-card-header">
              <h2>복용 시간</h2>
              <p>입력한 횟수만큼 회차가 자동으로 생성되고, 각 시간은 사용자가 직접 입력합니다.</p>
            </div>

            <div className="schedule-slot-list">
              {timeSlots.map((slot, index) => (
                <div className="schedule-slot-card" key={`slot-${index + 1}`}>
                  <div className="schedule-slot-title">{index + 1}회차</div>
                  <label>
                    시간
                    <input
                      type="time"
                      value={slot.takeTime}
                      onChange={(event) => handleTimeSlotChange(index, 'takeTime', event.target.value)}
                    />
                  </label>
                  <label>
                    복용 타이밍
                    <select
                      value={slot.timing}
                      onChange={(event) => handleTimeSlotChange(index, 'timing', event.target.value)}
                    >
                      <option value="AFTER_MEAL">식후</option>
                      <option value="BEFORE_MEAL">식전</option>
                      <option value="WITH_MEAL">식사 중</option>
                      <option value="EMPTY_STOMACH">공복</option>
                      <option value="BEDTIME">취침 전</option>
                      <option value="ANYTIME">상관없음</option>
                    </select>
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="schedule-actions">
            <button type="button" onClick={handleCreateSchedule}>복약 일정 저장</button>
            <button type="button" className="secondary" onClick={handleLoadSchedules}>내 일정 불러오기</button>
          </div>
        </section>

        <section className="schedule-card">
          <div className="schedule-card-header">
            <h2>방금 저장된 일정</h2>
            <p>실제 저장된 schedule 응답을 확인할 수 있습니다.</p>
          </div>
          <pre className="schedule-output">
            {createdSchedule ? formatJson(createdSchedule) : '저장 후 결과가 여기에 표시됩니다.'}
          </pre>
        </section>

        <section className="schedule-card">
          <div className="schedule-card-header">
            <h2>저장된 시간 목록</h2>
            <p>schedule_time 응답을 회차별로 확인할 수 있습니다.</p>
          </div>
          <pre className="schedule-output">
            {createdTimes.length ? formatJson(createdTimes) : '회차별 시간이 여기에 표시됩니다.'}
          </pre>
        </section>

        <section className="schedule-card schedule-card-wide">
          <div className="schedule-card-header">
            <h2>현재 사용자 일정 목록</h2>
            <p>저장 이후 전체 일정이 어떤 형태로 보이는지 빠르게 확인할 수 있습니다.</p>
          </div>
          {scheduleList.length ? (
            <div className="schedule-summary-list">
              {scheduleList.map((schedule) => (
                <div className="schedule-summary-card" key={schedule.id}>
                  <strong>{toScheduleCardLabel(schedule)}</strong>
                  <span>
                    {schedule.startDate} ~ {schedule.endDate}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <pre className="schedule-output">일정 불러오기를 누르면 목록이 여기에 표시됩니다.</pre>
          )}
        </section>
      </div>
    </div>
  )
}

export default ScheduleTest
