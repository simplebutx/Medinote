import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  createMedicationSchedule,
  initializeMedicationScheduleWindow,
  createMedicationScheduleTime,
} from '../../api'
import ScheduleForm from './ScheduleForm'
import {
  buildSchedulePayload,
  buildTimePayload,
  createDefaultScheduleForm,
  normalizeTimesPerDay,
  syncTimeSlots,
} from './scheduleFormUtils'

function ScheduleCreatePage() {
  const navigate = useNavigate()
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState(() => {
    return createDefaultScheduleForm()
  })
  const [timeSlots, setTimeSlots] = useState([
    { takeTime: '08:00', timing: 'AFTER_MEAL', sortOrder: 1 },
    { takeTime: '13:00', timing: 'AFTER_MEAL', sortOrder: 2 },
    { takeTime: '20:00', timing: 'AFTER_MEAL', sortOrder: 3 },
  ])

  const timesPerDay = useMemo(() => normalizeTimesPerDay(form.timesPerDay), [form.timesPerDay])

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
    setLoading(true)
    setMessage('')

    try {
      const schedule = await createMedicationSchedule(buildSchedulePayload(form))

      await Promise.all(
        timeSlots.map((slot, index) =>
          createMedicationScheduleTime(buildTimePayload(slot, schedule.id, index)),
        ),
      )

      await initializeMedicationScheduleWindow(schedule.id)

      navigate('/schedule-test', {
        state: {
          message: 'Schedule created successfully.',
        },
      })
    } catch (error) {
      setMessage(error.response?.data?.message || error.message || 'Failed to create schedule.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScheduleForm
      title="Create medication schedule"
      description="Build a schedule the same way a user would read and enter a prescription."
      submitLabel="Create schedule"
      form={form}
      timeSlots={timeSlots}
      calculatedWindow={null}
      message={message}
      loading={loading}
      onFormChange={handleFormChange}
      onTimeSlotChange={handleTimeSlotChange}
      onSubmit={handleSubmit}
    />
  )
}

export default ScheduleCreatePage
