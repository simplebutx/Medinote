import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  createMedicationSchedule,
  createMedicationScheduleTime,
} from '../../api'
import ScheduleForm from './ScheduleForm'
import {
  buildSchedulePayload,
  buildTimePayload,
  createDefaultScheduleForm,
  createMedicineForm,
  normalizeTimesPerDay,
  syncTimeSlots,
} from './scheduleFormUtils'

function ScheduleCreatePage() {
  const navigate = useNavigate()
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState(() => createDefaultScheduleForm())

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

  const createTimesSequentially = async (medicines) => {
    for (const [medicineIndex, medicine] of medicines.entries()) {
      const slots = form.medicines[medicineIndex]?.timeSlots || []

      for (const [slotIndex, slot] of slots.entries()) {
        await createMedicationScheduleTime(buildTimePayload(slot, medicine.id, slotIndex))
      }
    }
  }

  const handleSubmit = async () => {
    setLoading(true)
    setMessage('')

    try {
      const schedule = await createMedicationSchedule(buildSchedulePayload(form))
      const createdMedicines = schedule.medicines || []

      if (createdMedicines.length !== form.medicines.length) {
        throw new Error('Not all medicines were created.')
      }

      await createTimesSequentially(createdMedicines)

      navigate('/app/schedule', {
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
      calculatedWindow={null}
      message={message}
      loading={loading}
      onSharedFieldChange={handleSharedFieldChange}
      onMedicineFieldChange={handleMedicineFieldChange}
      onMedicineTimeSlotChange={handleMedicineTimeSlotChange}
      onAddMedicine={handleAddMedicine}
      onRemoveMedicine={handleRemoveMedicine}
      onSubmit={handleSubmit}
    />
  )
}

export default ScheduleCreatePage
