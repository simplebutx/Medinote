import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getMedicationScheduleTimes, getMedicationSchedules } from '../../api'
import { DEFAULT_USER_ID } from './constants'
import { formatScheduleCardLabel } from './scheduleFormUtils'
import ScheduleTabs from './ScheduleTabs'
import {
  WEEKDAY_LABELS,
  buildCalendarDays,
  formatIsoDate,
  getDoseTimesForDate,
  getEffectiveScheduleWindow,
  getDaySummaryLabel,
} from './scheduleCalendarUtils'

function ScheduleCalendarPage() {
  const navigate = useNavigate()
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [schedules, setSchedules] = useState([])
  const [scheduleTimesById, setScheduleTimesById] = useState({})
  const [currentMonth, setCurrentMonth] = useState(() => {
    const today = new Date()
    return new Date(today.getFullYear(), today.getMonth(), 1)
  })
  const [selectedDate, setSelectedDate] = useState(formatIsoDate(new Date()))

  useEffect(() => {
    const loadSchedules = async () => {
      setLoading(true)

      try {
        const data = await getMedicationSchedules(DEFAULT_USER_ID)
        const timeEntries = await Promise.all(
          data.map(async (schedule) => [
            schedule.id,
            await getMedicationScheduleTimes(schedule.id),
          ]),
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
      } catch (error) {
        setMessage(error.response?.data?.message || error.message || 'Failed to load schedules.')
      } finally {
        setLoading(false)
      }
    }

    loadSchedules()
  }, [])

  const calendarDays = useMemo(
    () => buildCalendarDays(currentMonth, schedules),
    [currentMonth, schedules],
  )

  const selectedDaySchedules = useMemo(
    () => schedules.filter(
      (schedule) =>
        schedule.effectiveStartDate &&
        schedule.effectiveEndDate &&
        schedule.effectiveStartDate <= selectedDate &&
        schedule.effectiveEndDate >= selectedDate,
    ),
    [schedules, selectedDate],
  )

  const moveMonth = (offset) => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + offset, 1))
  }

  return (
    <div className="schedule-page">
      <section className="schedule-hero">
        <div>
          <p className="schedule-eyebrow">Medication planner</p>
          <h1>My calendar</h1>
          <p className="schedule-subtitle">
            Check active schedule periods by date and open a day to see which medications are in progress.
          </p>
        </div>
        <div className="schedule-status-card">
          <span className="schedule-status-label">Calendar mode</span>
          <strong>{currentMonth.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}</strong>
          <strong>USER #{DEFAULT_USER_ID}</strong>
        </div>
      </section>

      <ScheduleTabs />

      {message && <div className="schedule-banner">{message}</div>}

      <section className="schedule-card schedule-card-wide">
        <div className="schedule-card-header">
          <h2>Monthly calendar</h2>
          <p>Each day shows how many medication schedules overlap with it.</p>
        </div>

        <div className="schedule-calendar-toolbar">
          <button type="button" className="schedule-secondary-link" onClick={() => moveMonth(-1)}>
            Previous
          </button>
          <strong className="schedule-calendar-month">
            {currentMonth.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
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
                <p>Schedules active on the selected day.</p>
              </div>

              {selectedDaySchedules.length ? (
                <div className="schedule-selected-day-list">
                  {selectedDaySchedules.map((schedule) => (
                    <button
                      key={`selected-${schedule.id}`}
                      type="button"
                      className="schedule-selected-day-item"
                      onClick={() => navigate(`/schedule-test/${schedule.id}/edit`)}
                    >
                      <strong>{formatScheduleCardLabel(schedule)}</strong>
                      <span>{schedule.hospitalName || 'No hospital'} · {schedule.pharmacyName || 'No pharmacy'}</span>
                      <span>{schedule.effectiveStartDate || schedule.startDate} - {schedule.effectiveEndDate || schedule.endDate}</span>
                      <span>
                        복용 시간:{' '}
                        {getDoseTimesForDate(
                          schedule,
                          scheduleTimesById[schedule.id] || [],
                          selectedDate,
                        ).join(', ') || '없음'}
                      </span>
                    </button>
                  ))}
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
