import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  deleteMedicationIntakeLog,
  deleteMedicationSchedule,
  deleteMedicationScheduleTime,
  getMedicationIntakeLogs,
  getMedicationSchedules,
  getMedicationScheduleTimes
} from '../../api'
import { formatScheduleCardLabel } from './scheduleFormUtils'
import ScheduleTabs from './ScheduleTabs'

function ScheduleListPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [message, setMessage] = useState(location.state?.message || '')
  const [loading, setLoading] = useState(true)
  const [schedules, setSchedules] = useState([])

  const loadSchedules = async () => {
    setLoading(true)

    try {
      const data = await getMedicationSchedules()
      setSchedules(data)
    } catch (error) {
      setMessage(error.response?.data?.message || error.message || 'Failed to load schedules.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSchedules()
  }, [])

  const handleDelete = async (scheduleId) => {
    const confirmed = window.confirm('Delete this schedule and its time slots?')

    if (!confirmed) {
      return
    }

    try {
      const [times, logs] = await Promise.all([
        getMedicationScheduleTimes(scheduleId),
        getMedicationIntakeLogs(scheduleId),
      ])

      await Promise.all(logs.map((log) => deleteMedicationIntakeLog(log.id)))
      await Promise.all(times.map((time) => deleteMedicationScheduleTime(time.id)))
      await deleteMedicationSchedule(scheduleId)

      setMessage('Schedule deleted successfully.')
      await loadSchedules()
    } catch (error) {
      setMessage(error.response?.data?.message || error.message || 'Failed to delete schedule.')
    }
  }

  return (
    <div className="schedule-page">
      <section className="schedule-hero">
        <div>
          <p className="schedule-eyebrow">Medication planner</p>
          <h1>My schedules</h1>
          <p className="schedule-subtitle">
            Review saved schedules, open an item to edit it, or remove it when it is no longer needed.
          </p>
        </div>
        <div className="schedule-status-card">
          <span className="schedule-status-label">Quick links</span>
          <strong>
            <Link className="schedule-inline-link" to="/schedule-test/new">
              Create schedule
            </Link>
          </strong>
          <strong>Signed-in user</strong>
        </div>
      </section>

      <ScheduleTabs />

      {message && <div className="schedule-banner">{message}</div>}

      <section className="schedule-card schedule-card-wide">
        <div className="schedule-card-header">
          <h2>Saved schedule list</h2>
          <p>Select a card to open the edit page. Delete stays available on each item.</p>
        </div>

        {loading ? (
          <div className="schedule-empty-state">Loading schedules...</div>
        ) : schedules.length ? (
          <div className="schedule-summary-list">
            {schedules.map((schedule) => (
              <div
                key={schedule.id}
                className="schedule-list-card"
                onClick={() => navigate(`/schedule-test/${schedule.id}/edit`)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    navigate(`/schedule-test/${schedule.id}/edit`)
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <div className="schedule-list-card-body">
                  <strong>{formatScheduleCardLabel(schedule)}</strong>
                  <span>
                    {schedule.hospitalName || 'No hospital'} · {schedule.pharmacyName || 'No pharmacy'}
                  </span>
                  <span>
                    {schedule.startDate} - {schedule.endDate}
                  </span>
                  <span>
                    Prescribed: {schedule.prescribedDate || '-'} · Dispensed: {schedule.dispensedDate || '-'}
                  </span>
                  <span>Status: {schedule.isActive ? 'Active' : 'Inactive'}</span>
                </div>
                <div className="schedule-list-card-actions">
                  <span className="schedule-list-link">Edit</span>
                  <button
                    type="button"
                    className="schedule-danger-button"
                    onClick={(event) => {
                      event.stopPropagation()
                      handleDelete(schedule.id)
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="schedule-empty-state">
            <p>No schedules yet.</p>
            <Link className="schedule-primary-link" to="/schedule-test/new">
              Create your first schedule
            </Link>
          </div>
        )}
      </section>
    </div>
  )
}

export default ScheduleListPage
