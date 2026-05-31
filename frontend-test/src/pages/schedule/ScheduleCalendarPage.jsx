import { useEffect, useMemo, useState } from 'react'
import {
  createMedicationIntakeLog,
  deleteMedicationIntakeLog,
  getMedicationIntakeLogs,
  getMedicationScheduleTimes,
  getMedicationSchedules,
} from '../../api'
import ScheduleTabs from './ScheduleTabs'
import {
  WEEKDAY_LABELS,
  buildCalendarDays,
  formatIsoDate,
  getDaySummaryLabel,
  getDoseTimesForDate,
  getEffectiveScheduleWindow,
} from './scheduleCalendarUtils'

function normalizeTakeTime(value) {
  if (!value) {
    return ''
  }

  return String(value).slice(0, 5)
}

function parseServerDateTime(value) {
  if (!value) {
    return null
  }

  if (/[zZ]$|[+-]\d{2}:\d{2}$/.test(value)) {
    return new Date(value)
  }

  return new Date(`${value}Z`)
}

function getDatePart(value) {
  if (!value) {
    return null
  }

  return String(value).split('T')[0] || null
}

function formatTimeLabel(value) {
  const normalized = normalizeTakeTime(value)

  if (!normalized) {
    return '시간 미정'
  }

  const [hourText = '0', minuteText = '00'] = normalized.split(':')
  const hour = Number(hourText)
  const minute = Number(minuteText)
  const period = hour < 12 ? '오전' : '오후'
  const twelveHour = hour % 12 || 12

  return `${period} ${twelveHour}:${String(minute).padStart(2, '0')}`
}

function formatTakenAt(value) {
  const date = parseServerDateTime(value)

  if (!date || Number.isNaN(date.getTime())) {
    return ''
  }

  return date.toLocaleTimeString('ko-KR', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

function toLocalDateTimeString(isoDate, takeTime) {
  return `${isoDate}T${normalizeTakeTime(takeTime) || '00:00'}:00`
}

function getScheduleMedicine(schedule, medicationScheduleMedicineId) {
  return (schedule.medicines || []).find((medicine) => medicine.id === medicationScheduleMedicineId) || null
}

function buildDoseGroups({ schedules, scheduleTimesById, intakeLogsByScheduleId, selectedDate }) {
  const groups = []
  const groupMap = new Map()

  schedules.forEach((schedule) => {
    if (
      !schedule.effectiveStartDate ||
      !schedule.effectiveEndDate ||
      schedule.effectiveStartDate > selectedDate ||
      schedule.effectiveEndDate < selectedDate
    ) {
      return
    }

    const scheduleTimes = scheduleTimesById[schedule.id] || []
    const visibleTimes = new Set(getDoseTimesForDate(schedule, scheduleTimes, selectedDate))
    const intakeLogs = intakeLogsByScheduleId[schedule.id] || []

    scheduleTimes.forEach((scheduleTime) => {
      const takeTime = normalizeTakeTime(scheduleTime.takeTime)

      if (!takeTime || !visibleTimes.has(takeTime)) {
        return
      }

      const scheduleMedicine = getScheduleMedicine(schedule, scheduleTime.medicationScheduleMedicineId)
      const matchingTakenLogs = intakeLogs.filter(
        (log) =>
          log.medicationScheduleTimeId === scheduleTime.id &&
          log.status === 'TAKEN' &&
          getDatePart(log.scheduledAt) === selectedDate,
      )

      const medicine = {
        scheduleId: schedule.id,
        scheduleTimeId: scheduleTime.id,
        name:
          scheduleMedicine?.customMedicineName ||
          schedule.customMedicineName ||
          `Medicine #${schedule.medicineId || '-'}`,
        scheduledAt: toLocalDateTimeString(selectedDate, takeTime),
        takenLogIds: matchingTakenLogs.map((log) => log.id),
        takenAt: matchingTakenLogs[0]?.takenAt || null,
      }

      if (!groupMap.has(takeTime)) {
        const group = {
          key: takeTime,
          takeTime,
          items: [medicine],
        }

        groupMap.set(takeTime, group)
        groups.push(group)
        return
      }

      groupMap.get(takeTime).items.push(medicine)
    })
  })

  return groups
    .map((group) => ({
      ...group,
      items: group.items.sort((left, right) => left.name.localeCompare(right.name, 'ko-KR')),
    }))
    .sort((left, right) => left.takeTime.localeCompare(right.takeTime))
}

function ScheduleCalendarPage() {
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [schedules, setSchedules] = useState([])
  const [scheduleTimesById, setScheduleTimesById] = useState({})
  const [intakeLogsByScheduleId, setIntakeLogsByScheduleId] = useState({})
  const [currentMonth, setCurrentMonth] = useState(() => {
    const today = new Date()
    return new Date(today.getFullYear(), today.getMonth(), 1)
  })
  const [selectedDate, setSelectedDate] = useState(formatIsoDate(new Date()))

  const loadIntakeLogs = async (scheduleList) => {
    const source = scheduleList ?? schedules
    const logEntries = await Promise.all(
      source.map(async (schedule) => [schedule.id, await getMedicationIntakeLogs(schedule.id)]),
    )

    setIntakeLogsByScheduleId(Object.fromEntries(logEntries))
  }

  const loadSchedules = async () => {
    setLoading(true)

    try {
      const data = await getMedicationSchedules()
      const timeEntries = await Promise.all(
        data.map(async (schedule) => [schedule.id, await getMedicationScheduleTimes(schedule.id)]),
      )
      const nextScheduleTimesById = Object.fromEntries(timeEntries)

      setScheduleTimesById(nextScheduleTimesById)
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

      const logEntries = await Promise.all(
        data.map(async (schedule) => [schedule.id, await getMedicationIntakeLogs(schedule.id)]),
      )
      setIntakeLogsByScheduleId(Object.fromEntries(logEntries))
    } catch (error) {
      setMessage(error.response?.data?.message || error.message || 'Failed to load schedules.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSchedules()
  }, [])

  const calendarDays = useMemo(
    () => buildCalendarDays(currentMonth, schedules),
    [currentMonth, schedules],
  )

  const selectedDateDoseGroups = useMemo(
    () => buildDoseGroups({ schedules, scheduleTimesById, intakeLogsByScheduleId, selectedDate }),
    [intakeLogsByScheduleId, scheduleTimesById, schedules, selectedDate],
  )

  const moveMonth = (offset) => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + offset, 1))
  }

  const handleToggleMedicine = async (medicine) => {
    setActionLoading(true)

    try {
      if (medicine.takenLogIds.length) {
        await Promise.all(medicine.takenLogIds.map((id) => deleteMedicationIntakeLog(id)))
      } else {
        await createMedicationIntakeLog({
          medicationScheduleId: medicine.scheduleId,
          medicationScheduleTimeId: medicine.scheduleTimeId,
          status: 'TAKEN',
          scheduledAt: medicine.scheduledAt,
          takenAt: new Date().toISOString().slice(0, 19),
        })
      }

      await loadIntakeLogs()
    } catch (error) {
      setMessage(error.response?.data?.message || error.message || 'Failed to update intake status.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleCompleteGroup = async (group) => {
    const pendingItems = group.items.filter((item) => !item.takenLogIds.length)

    if (!pendingItems.length) {
      return
    }

    setActionLoading(true)

    try {
      await Promise.all(
        pendingItems.map((item) =>
          createMedicationIntakeLog({
            medicationScheduleId: item.scheduleId,
            medicationScheduleTimeId: item.scheduleTimeId,
            status: 'TAKEN',
            scheduledAt: item.scheduledAt,
            takenAt: new Date().toISOString().slice(0, 19),
          }),
        ),
      )

      await loadIntakeLogs()
    } catch (error) {
      setMessage(error.response?.data?.message || error.message || 'Failed to complete this round.')
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="schedule-page">
      <section className="schedule-hero">
        <div>
          <p className="schedule-eyebrow">Medication planner</p>
          <h1>My calendar</h1>
          <p className="schedule-subtitle">
            날짜를 눌러 그날 먹어야 하는 약과 복용 체크 상태를 확인할 수 있어요.
          </p>
        </div>
        <div className="schedule-status-card">
          <span className="schedule-status-label">Calendar mode</span>
          <strong>{currentMonth.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' })}</strong>
          <strong>{selectedDate}</strong>
        </div>
      </section>

      <ScheduleTabs />

      {message && <div className="schedule-banner">{message}</div>}

      <section className="schedule-card schedule-card-wide">
        <div className="schedule-card-header">
          <h2>Monthly calendar</h2>
          <p>날짜를 누르면 해당 날짜 복약 목록이 아래에 표시됩니다.</p>
        </div>

        <div className="schedule-calendar-toolbar">
          <button type="button" className="schedule-secondary-link" onClick={() => moveMonth(-1)}>
            Previous
          </button>
          <strong className="schedule-calendar-month">
            {currentMonth.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' })}
          </strong>
          <button type="button" className="schedule-secondary-link" onClick={() => moveMonth(1)}>
            Next
          </button>
        </div>

        {loading ? (
          <div className="schedule-empty-state">Loading calendar...</div>
        ) : (
          <>
            <div className="schedule-calendar-grid">
              {WEEKDAY_LABELS.map((label) => (
                <div key={label} className="schedule-calendar-weekday">
                  {label}
                </div>
              ))}

              {calendarDays.map((day) => (
                <button
                  key={day.isoDate}
                  type="button"
                  className={[
                    'schedule-calendar-day',
                    day.isCurrentMonth ? '' : 'schedule-calendar-day-muted',
                    day.isToday ? 'schedule-calendar-day-today' : '',
                    selectedDate === day.isoDate ? 'schedule-calendar-day-selected' : '',
                  ].join(' ').trim()}
                  onClick={() => setSelectedDate(day.isoDate)}
                >
                  <span className="schedule-calendar-day-number">{day.dayNumber}</span>
                  {day.schedules.length ? (
                    <div className="schedule-calendar-markers">
                      <span className="schedule-calendar-badge">{day.schedules.length} schedule</span>
                      {day.schedules.slice(0, 2).map((schedule) => (
                        <span key={`${day.isoDate}-${schedule.id}`} className="schedule-calendar-pill">
                          {getDaySummaryLabel(schedule)}
                        </span>
                      ))}
                      {day.schedules.length > 2 ? (
                        <span className="schedule-calendar-more">+{day.schedules.length - 2} more</span>
                      ) : null}
                    </div>
                  ) : null}
                </button>
              ))}
            </div>

            <div className="schedule-selected-day-panel">
              <div className="schedule-card-header">
                <h2>{selectedDate}</h2>
                <p>선택한 날짜의 복약 목록입니다.</p>
              </div>

              {selectedDateDoseGroups.length ? (
                <div className="today-dose-list">
                  {selectedDateDoseGroups.map((group) => {
                    const completedCount = group.items.filter((item) => item.takenLogIds.length).length
                    const isComplete = completedCount === group.items.length

                    return (
                      <article
                        key={group.key}
                        className={`today-dose-card${isComplete ? ' today-dose-card-complete' : ''}`}
                      >
                        <div className="today-dose-status-rail">
                          <span>{isComplete ? '완료' : '예정'}</span>
                        </div>
                        <div className="today-dose-body">
                          <div className="today-dose-header">
                            <strong>{formatTimeLabel(group.takeTime)}</strong>
                            <small>{completedCount}/{group.items.length}</small>
                          </div>

                          <div className="today-dose-chip-list">
                            {group.items.map((item) => (
                              <button
                                key={`${item.scheduleTimeId}-${item.scheduleId}`}
                                type="button"
                                className={`today-dose-chip${item.takenLogIds.length ? ' today-dose-chip-complete' : ''}`}
                                onClick={() => handleToggleMedicine(item)}
                                disabled={actionLoading}
                              >
                                <span className="today-dose-chip-dot" />
                                <strong>{item.name}</strong>
                                {item.takenLogIds.length ? <small>{formatTakenAt(item.takenAt) || '완료'}</small> : null}
                              </button>
                            ))}
                          </div>

                          <div className="today-dose-actions">
                            <button
                              type="button"
                              className="today-dose-complete-button"
                              onClick={() => handleCompleteGroup(group)}
                              disabled={actionLoading || isComplete}
                            >
                              전체 완료
                            </button>
                          </div>
                        </div>
                      </article>
                    )
                  })}
                </div>
              ) : (
                <div className="schedule-empty-state">No schedules on this day.</div>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  )
}

export default ScheduleCalendarPage
