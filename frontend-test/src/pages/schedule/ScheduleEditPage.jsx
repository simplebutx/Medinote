import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  createMedicationScheduleTime,
  deleteMedicationScheduleTime,
  getMedicationSchedule,
  getMedicationScheduleTimes,
  initializeMedicationScheduleWindow,
  updateMedicationSchedule,
} from '../../api'
import { DEFAULT_USER_ID } from './constants'
import ScheduleForm from './ScheduleForm'
import {
  buildSchedulePayload,
  buildTimePayload,
  createDefaultScheduleForm,
  mapScheduleToForm,
  mapTimesToSlots,
  normalizeTimesPerDay,
  syncTimeSlots,
} from './scheduleFormUtils'

function ScheduleEditPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [scheduleSummary, setScheduleSummary] = useState(null)
  const [timeSlots, setTimeSlots] = useState([])
  const [existingTimes, setExistingTimes] = useState([])
  const [form, setForm] = useState(() => createDefaultScheduleForm())

  const timesPerDay = useMemo(() => normalizeTimesPerDay(form.timesPerDay), [form.timesPerDay])

  useEffect(() => {
    const loadSchedule = async () => {
      setLoading(true)

      try {
        const [schedule, times] = await Promise.all([
          getMedicationSchedule(id),
          getMedicationScheduleTimes(id),
        ])

        setScheduleSummary(schedule)
        setForm(mapScheduleToForm(schedule))
        setExistingTimes(times)
        setTimeSlots(mapTimesToSlots(times, schedule.timesPerDay || 1))
      } catch (error) {
        setMessage(error.response?.data?.message || error.message || 'Failed to load schedule.')
      } finally {
        setLoading(false)
      }
    }

    loadSchedule()
  }, [id])

  const handleFormChange = (event) => {
    const { name, value } = event.target

    if (name === 'timesPerDay') {
      const nextCount = value === '' ? '1' : String(normalizeTimesPerDay(value))
      setForm((prev) => ({ ...prev, timesPerDay: nextCount }))
      setTimeSlots((prev) => syncTimeSlots(prev, Number(nextCount)))
      return
    }

    setForm((prev) => ({ ...prev, [name]: value }))
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

  const handleSubmit = async () => {
    setSaving(true)
    setMessage('')

    try {
      await updateMedicationSchedule(id, buildSchedulePayload(form, DEFAULT_USER_ID))

      await Promise.all(existingTimes.map((time) => deleteMedicationScheduleTime(time.id)))
      await Promise.all(
        timeSlots.map((slot, index) =>
          createMedicationScheduleTime(buildTimePayload(slot, Number(id), index)),
        ),
      )

      const recalculatedSchedule = await initializeMedicationScheduleWindow(id)
      setScheduleSummary(recalculatedSchedule)

      navigate('/schedule-test', {
        state: {
          message: 'Schedule updated successfully.',
        },
      })
    } catch (error) {
      setMessage(error.response?.data?.message || error.message || 'Failed to update schedule.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="schedule-page">
        <div className="schedule-empty-state">Loading schedule...</div>
      </div>
    )
  }

  return (
    <ScheduleForm
      title={`Edit schedule #${id}`}
      description="Adjust the saved medication plan and rewrite the time slots in one place."
      submitLabel="Save changes"
      form={form}
      timeSlots={timeSlots}
      calculatedWindow={scheduleSummary}
      message={message}
      loading={saving}
      onFormChange={handleFormChange}
      onTimeSlotChange={handleTimeSlotChange}
      onSubmit={handleSubmit}
    />
  )
}

export default ScheduleEditPage
