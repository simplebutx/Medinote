import { useEffect, useMemo, useState } from 'react'
import {
  createMedicationIntakeLog,
  deleteMedicationIntakeLog,
  getMedicationIntakeLogs,
  getMedicationScheduleTimes,
  getMedicationSchedules,
} from '../api'
import {
  buildCalendarDays,
  formatIsoDate,
  getDoseTimesForDate,
  getEffectiveScheduleWindow,
} from './schedule/scheduleCalendarUtils'

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']

function normalizeTakeTime(value) {
  return String(value || '').slice(0, 5)
}

function formatTimeLabel(value) {
  return normalizeTakeTime(value) || '시간 미정'
}

function getScheduleName(schedule) {
  return (
    schedule.customMedicineName ||
    schedule.medicines?.[0]?.customMedicineName ||
    `약 #${schedule.medicineId || schedule.id}`
  )
}

function getScheduleMedicine(schedule, medicationScheduleMedicineId) {
  return (schedule.medicines || []).find((medicine) => medicine.id === medicationScheduleMedicineId) || null
}

function buildDoseGroups({ schedules, scheduleTimesById, intakeLogsByScheduleId, selectedDate }) {
  const groups = []
  const groupMap = new Map()

  schedules.forEach((schedule) => {
    if (!schedule.effectiveStartDate || !schedule.effectiveEndDate) return
    if (schedule.effectiveStartDate > selectedDate || schedule.effectiveEndDate < selectedDate) return

    const scheduleTimes = scheduleTimesById[schedule.id] || []
    const visibleTimes = new Set(getDoseTimesForDate(schedule, scheduleTimes, selectedDate))
    const intakeLogs = intakeLogsByScheduleId[schedule.id] || []

    scheduleTimes.forEach((scheduleTime) => {
      const takeTime = normalizeTakeTime(scheduleTime.takeTime)
      if (!takeTime || !visibleTimes.has(takeTime)) return

      const scheduleMedicine = getScheduleMedicine(schedule, scheduleTime.medicationScheduleMedicineId)
      const matchingLogs = intakeLogs.filter(
        (log) =>
          log.medicationScheduleTimeId === scheduleTime.id &&
          String(log.scheduledAt || '').startsWith(selectedDate),
      )

      const dosageAmount =
        scheduleMedicine?.dosageAmount ?? schedule.dosageAmount ?? schedule.medicines?.[0]?.dosageAmount ?? 1
      const dosageUnit =
        scheduleMedicine?.dosageUnit ?? schedule.dosageUnit ?? schedule.medicines?.[0]?.dosageUnit ?? ''

      const item = {
        scheduleId: schedule.id,
        scheduleTimeId: scheduleTime.id,
        name: scheduleMedicine?.customMedicineName || getScheduleName(schedule),
        dosage: `${dosageAmount}${dosageUnit}`,
        timing: scheduleTime.timing || 'AFTER_MEAL',
        time: takeTime,
        status: matchingLogs[0]?.status || 'PENDING',
        logIds: matchingLogs.map((log) => log.id),
      }

      if (!groupMap.has(takeTime)) {
        const group = { time: takeTime, items: [item] }
        groupMap.set(takeTime, group)
        groups.push(group)
        return
      }

      groupMap.get(takeTime).items.push(item)
    })
  })

  return groups.sort((a, b) => a.time.localeCompare(b.time))
}

function getCompletionRate(items) {
  if (!items.length) return 0
  const takenCount = items.filter((item) => item.status === 'TAKEN').length
  return Math.round((takenCount / items.length) * 100)
}

function getRateClass(rate) {
  if (rate >= 80) return 'good'
  if (rate >= 50) return 'medium'
  if (rate > 0) return 'poor'
  return 'empty'
}

function ScheduleDashboardPage() {
  const todayText = formatIsoDate(new Date())
  const [selectedDate, setSelectedDate] = useState(todayText)
  const [currentMonth, setCurrentMonth] = useState(() => {
    const today = new Date()
    return new Date(today.getFullYear(), today.getMonth(), 1)
  })
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [schedules, setSchedules] = useState([])
  const [scheduleTimesById, setScheduleTimesById] = useState({})
  const [intakeLogsByScheduleId, setIntakeLogsByScheduleId] = useState({})

  const loadSchedules = async () => {
    setLoading(true)

    try {
      const data = await getMedicationSchedules()
      const timeEntries = await Promise.all(
        data.map(async (schedule) => [schedule.id, await getMedicationScheduleTimes(schedule.id)]),
      )
      const nextScheduleTimesById = Object.fromEntries(timeEntries)
      const logEntries = await Promise.all(
        data.map(async (schedule) => [schedule.id, await getMedicationIntakeLogs(schedule.id)]),
      )

      setScheduleTimesById(nextScheduleTimesById)
      setIntakeLogsByScheduleId(Object.fromEntries(logEntries))
      setSchedules(
        data.map((schedule) => {
          const window = getEffectiveScheduleWindow(schedule, nextScheduleTimesById[schedule.id] || [])
          return {
            ...schedule,
            effectiveStartDate: window.startDate,
            effectiveEndDate: window.endDate,
          }
        }),
      )
      setMessage('')
    } catch (error) {
      setMessage(error.response?.data?.message || error.message || '복약 일정을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSchedules()
  }, [])

  const doseGroups = useMemo(
    () => buildDoseGroups({ schedules, scheduleTimesById, intakeLogsByScheduleId, selectedDate }),
    [intakeLogsByScheduleId, scheduleTimesById, schedules, selectedDate],
  )

  const selectedItems = useMemo(() => doseGroups.flatMap((group) => group.items), [doseGroups])
  const selectedCompletionRate = getCompletionRate(selectedItems)
  const selectedRemainingCount = selectedItems.filter((item) => item.status !== 'TAKEN').length
  const activeScheduleCount = schedules.filter((schedule) => schedule.isActive !== false).length

  const calendarDays = useMemo(() => buildCalendarDays(currentMonth, schedules), [currentMonth, schedules])

  const calendarWithRates = useMemo(
    () =>
      calendarDays.map((day) => {
        const items = buildDoseGroups({
          schedules,
          scheduleTimesById,
          intakeLogsByScheduleId,
          selectedDate: day.isoDate,
        }).flatMap((group) => group.items)

        return {
          ...day,
          rate: items.length ? getCompletionRate(items) : null,
        }
      }),
    [calendarDays, intakeLogsByScheduleId, scheduleTimesById, schedules],
  )

  const setItemStatus = async (item, status) => {
    try {
      if (item.logIds.length) {
        await Promise.all(item.logIds.map((id) => deleteMedicationIntakeLog(id)))
      }

      if (status !== 'PENDING') {
        await createMedicationIntakeLog({
          medicationScheduleId: item.scheduleId,
          medicationScheduleTimeId: item.scheduleTimeId,
          status,
          scheduledAt: `${selectedDate}T${item.time}:00`,
          takenAt: status === 'TAKEN' ? new Date().toISOString().slice(0, 19) : null,
        })
      }

      await loadSchedules()
    } catch (error) {
      setMessage(error.response?.data?.message || error.message || '복약 상태를 변경하지 못했습니다.')
    }
  }

  return (
    <div className="app-page">
      <div className="app-page-header">
        <p className="app-page-eyebrow">Medication Schedule</p>
        <h1 className="app-page-title">복약 일정</h1>
        <p className="app-page-description">오늘 복용해야 할 약과 주간 복약 현황을 확인합니다.</p>
      </div>

      <div className="schedule-stats-grid">
        <section className="app-card">
          <p className="schedule-stat-label">선택 날짜 복약 완료율</p>
          <strong className="schedule-stat-value primary">{selectedCompletionRate}%</strong>
          <p className="schedule-stat-help">
            {selectedItems.length}개 중 {selectedItems.filter((item) => item.status === 'TAKEN').length}개 복용 완료
          </p>
        </section>
        <section className="app-card">
          <p className="schedule-stat-label">선택 날짜 남은 복약</p>
          <strong className="schedule-stat-value">{selectedRemainingCount}개</strong>
          <p className="schedule-stat-help">예정 상태의 약을 확인해 주세요.</p>
        </section>
        <section className="app-card">
          <p className="schedule-stat-label">등록된 복약 일정</p>
          <strong className="schedule-stat-value warning">{activeScheduleCount}개</strong>
          <p className="schedule-stat-help">현재 활성 복약 일정 기준입니다.</p>
        </section>
      </div>

      {message ? <div className="schedule-banner-panel">{message}</div> : null}

      <section className="app-card">
        <div className="schedule-panel-header">
          <div>
            <h2>
              {currentMonth.getFullYear()}년 {currentMonth.getMonth() + 1}월 복약 달력
            </h2>
            <p>날짜를 클릭하면 아래 복약 목록이 선택한 날짜 기준으로 표시됩니다.</p>
          </div>

          <div className="schedule-calendar-controls">
            <div className="schedule-legend-row">
              <span className="good">80% 이상</span>
              <span className="medium">50% 이상</span>
              <span className="poor">50% 미만</span>
              <span className="empty">일정 없음</span>
            </div>
            <div className="schedule-control-buttons">
              <button type="button" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}>
                이전 달
              </button>
              <button
                type="button"
                onClick={() => {
                  const now = new Date()
                  setCurrentMonth(new Date(now.getFullYear(), now.getMonth(), 1))
                  setSelectedDate(todayText)
                }}
              >
                오늘
              </button>
              <button type="button" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}>
                다음 달
              </button>
            </div>
          </div>
        </div>

        <div className="dashboard-calendar-grid">
          {WEEKDAY_LABELS.map((label) => (
            <div key={label} className="dashboard-weekday-cell">
              {label}
            </div>
          ))}

          {calendarWithRates.map((day) => (
            <button
              key={day.isoDate}
              type="button"
              className={[
                'dashboard-calendar-cell',
                day.isCurrentMonth ? '' : 'muted',
                selectedDate === day.isoDate ? 'selected' : '',
                day.rate == null ? 'empty' : getRateClass(day.rate),
              ]
                .join(' ')
                .trim()}
              onClick={() => setSelectedDate(day.isoDate)}
            >
              <span className="date-number">{day.dayNumber}</span>
              {day.rate != null ? <strong>{day.rate}%</strong> : null}
            </button>
          ))}
        </div>
      </section>

      <section className="app-card">
        <div className="schedule-panel-header">
          <div>
            <h2>선택 날짜 복약</h2>
            <p>{selectedDate} 기준 복약 목록입니다.</p>
          </div>
          <span className="today-pill">{selectedDate === todayText ? '오늘' : '선택됨'}</span>
        </div>

        {loading ? (
          <div className="app-placeholder-card">복약 일정을 불러오는 중입니다.</div>
        ) : doseGroups.length === 0 ? (
          <div className="app-placeholder-card">선택한 날짜에 등록된 복약 일정이 없습니다.</div>
        ) : (
          <div className="schedule-dose-groups">
            {doseGroups.map((group) => (
              <section key={group.time} className="dose-time-group">
                <div className="dose-time-header">
                  <div>
                    <strong>{formatTimeLabel(group.time)}</strong>
                    <p>같은 시간대 복약 {group.items.length}개</p>
                  </div>
                </div>

                <div className="dose-item-list">
                  {group.items.map((item) => (
                    <article key={`${item.scheduleId}-${item.scheduleTimeId}`} className="dose-item-card">
                      <div>
                        <div className="dose-title-row">
                          <h3>{item.name}</h3>
                          <span className={`dose-status ${item.status === 'TAKEN' ? 'done' : item.status === 'SKIPPED' ? 'skipped' : ''}`}>
                            {item.status === 'TAKEN' ? '복용 완료' : item.status === 'SKIPPED' ? '건너뜀' : '예정'}
                          </span>
                        </div>
                        <p>{item.time} · {item.dosage} · {item.timing}</p>
                      </div>

                      <div className="dose-actions">
                        <button
                          type="button"
                          className={item.status === 'TAKEN' ? 'primary active' : 'primary'}
                          onClick={() => setItemStatus(item, item.status === 'TAKEN' ? 'PENDING' : 'TAKEN')}
                        >
                          복용 완료
                        </button>
                        <button
                          type="button"
                          className={item.status === 'SKIPPED' ? 'ghost active' : 'ghost'}
                          onClick={() => setItemStatus(item, item.status === 'SKIPPED' ? 'PENDING' : 'SKIPPED')}
                        >
                          건너뜀
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default ScheduleDashboardPage
