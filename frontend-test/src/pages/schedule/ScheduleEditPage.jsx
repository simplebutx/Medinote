import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  createMedicationScheduleTime,
  deleteMedicationScheduleTime,
  getMedicationSchedule,
  getMedicationScheduleTimes,
  initializeMedicationScheduleWindow,
  updateMedicationSchedule,
} from '../../api'
import ScheduleForm from './ScheduleForm'
import {
  buildSchedulePayload,
  buildTimePayload,
  createMedicineForm,
  createDefaultScheduleForm,
  mapScheduleToForm,
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
  const [existingTimes, setExistingTimes] = useState([])
  const [form, setForm] = useState(() => createDefaultScheduleForm())

  useEffect(() => {
    const loadSchedule = async () => {
      setLoading(true)

      try {
        const [schedule, times] = await Promise.all([
          getMedicationSchedule(id),
          getMedicationScheduleTimes(id),
        ])

        setScheduleSummary(schedule)
        setForm(mapScheduleToForm(schedule, times))
        setExistingTimes(times)
      } catch (error) {
        setMessage(error.response?.data?.message || error.message || 'Failed to load schedule.')
      } finally {
        setLoading(false)
      }
    }

    loadSchedule()
  }, [id])

  const handleSharedFieldChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleMedicineFieldChange = (medicineIndex, event) => {
    const { name, value } = event.target

    setForm((prev) => ({
      ...prev,
      medicines: prev.medicines.map((medicine, index) => {
        if (index !== medicineIndex) {
          return medicine
        }

        if (name === 'timesPerDay') {
          const nextCount = value === '' ? '1' : String(normalizeTimesPerDay(value))
          return {
            ...medicine,
            timesPerDay: nextCount,
            timeSlots: syncTimeSlots(medicine.timeSlots, Number(nextCount)),
          }
        }

        return {
          ...medicine,
          [name]: value,
        }
      }),
    }))
  }

  const handleMedicineTimeSlotChange = (medicineIndex, slotIndex, field, value) => {
    setForm((prev) => ({
      ...prev,
      medicines: prev.medicines.map((medicine, index) => {
        if (index !== medicineIndex) {
          return medicine
        }

        return {
          ...medicine,
          timeSlots: medicine.timeSlots.map((slot, currentSlotIndex) =>
            currentSlotIndex === slotIndex
              ? {
                  ...slot,
                  [field]: value,
                }
              : slot,
          ),
        }
      }),
    }))
  }

  const handleAddMedicine = () => {
    setForm((prev) => ({
      ...prev,
      medicines: [...prev.medicines, createMedicineForm()],
    }))
  }

  const handleRemoveMedicine = (medicineIndex) => {
    setForm((prev) => ({
      ...prev,
      medicines: prev.medicines.filter((_, index) => index !== medicineIndex),
    }))
  }

  const handleSubmit = async () => {
    setSaving(true)
    setMessage('')

    try {
      const updatedSchedule = await updateMedicationSchedule(id, buildSchedulePayload(form))
      const updatedMedicines = updatedSchedule.medicines || []

      if (updatedMedicines.length !== form.medicines.length) {
        throw new Error('Not all medicines were created.')
      }

      await Promise.all(existingTimes.map((time) => deleteMedicationScheduleTime(time.id)))
      await Promise.all(
        updatedMedicines.flatMap((updatedMedicine, medicineIndex) =>
          (form.medicines[medicineIndex]?.timeSlots || []).map((slot, slotIndex) =>
            createMedicationScheduleTime(buildTimePayload(slot, updatedMedicine.id, slotIndex)),
          ),
        ),
      )

      const recalculatedSchedule = await initializeMedicationScheduleWindow(id)
      setScheduleSummary(recalculatedSchedule)

      navigate('/app/schedule', {
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
      calculatedWindow={scheduleSummary}
      message={message}
      loading={saving}
      onSharedFieldChange={handleSharedFieldChange}
      onMedicineFieldChange={handleMedicineFieldChange}
      onMedicineTimeSlotChange={handleMedicineTimeSlotChange}
      onAddMedicine={handleAddMedicine}
      onRemoveMedicine={handleRemoveMedicine}
      onSubmit={handleSubmit}
    />
  )
}

export default ScheduleEditPage
