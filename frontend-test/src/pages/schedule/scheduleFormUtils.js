import { MAX_TIMES_PER_DAY } from './constants'

export function createTimeSlot(index) {
  return {
    takeTime: '',
    timing: 'AFTER_MEAL',
    sortOrder: index + 1,
  }
}

export function syncTimeSlots(previousSlots, nextCount) {
  return Array.from({ length: nextCount }, (_, index) => ({
    ...(previousSlots[index] || createTimeSlot(index)),
    sortOrder: index + 1,
  }))
}

export function createMedicineForm() {
  return {
    customMedicineName: '',
    dosageAmount: '1',
    dosageUnit: 'TABLET',
    timesPerDay: '3',
    durationDays: '7',
    timeSlots: [
      { takeTime: '08:00', timing: 'AFTER_MEAL', sortOrder: 1 },
      { takeTime: '13:00', timing: 'AFTER_MEAL', sortOrder: 2 },
      { takeTime: '20:00', timing: 'AFTER_MEAL', sortOrder: 3 },
    ],
  }
}

export function createDefaultScheduleForm() {
  return {
    hospitalName: '',
    pharmacyName: '',
    prescribedDate: '',
    dispensedDate: '',
    medicines: [createMedicineForm()],
  }
}

export function normalizeTimesPerDay(value) {
  const parsed = Number(value)

  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1
  }

  return Math.min(parsed, MAX_TIMES_PER_DAY)
}

export function normalizeDurationDays(value) {
  const parsed = Number(value)

  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1
  }

  return parsed
}

export function buildSchedulePayload(form) {
  const medicines = form.medicines.map((medicine) => {
    const timesPerDay = normalizeTimesPerDay(medicine.timesPerDay)
    const durationDays = normalizeDurationDays(medicine.durationDays)

    return {
      medicineId: null,
      customMedicineName: medicine.customMedicineName || null,
      dosageAmount: medicine.dosageAmount ? Number(medicine.dosageAmount) : null,
      dosageUnit: medicine.dosageUnit || null,
      frequencyType: 'DAILY',
      timesPerDay,
      intervalHours: null,
      durationDays,
    }
  })

  const primaryMedicine = medicines[0] || null

  return {
    medicineId: primaryMedicine?.medicineId ?? null,
    customMedicineName: primaryMedicine?.customMedicineName ?? null,
    hospitalName: form.hospitalName || null,
    pharmacyName: form.pharmacyName || null,
    dosageAmount: primaryMedicine?.dosageAmount ?? null,
    dosageUnit: primaryMedicine?.dosageUnit ?? null,
    frequencyType: primaryMedicine?.frequencyType ?? 'DAILY',
    timesPerDay: primaryMedicine?.timesPerDay ?? 1,
    intervalHours: null,
    durationDays: primaryMedicine?.durationDays ?? 1,
    startDate: null,
    endDate: null,
    prescribedDate: form.prescribedDate || null,
    dispensedDate: form.dispensedDate || null,
    isActive: null,
    medicines,
  }
}

export function buildTimePayload(slot, scheduleMedicineId, index) {
  return {
    medicationScheduleMedicineId: scheduleMedicineId,
    timing: slot.timing,
    takeTime: slot.takeTime,
    sortOrder: index + 1,
  }
}

export function mapScheduleToForm(schedule, times) {
  const groupedTimes = groupTimesByMedicineId(times)
  const medicines = (schedule.medicines || []).map((medicine) => {
    const timeSlots = mapTimesToSlots(
      groupedTimes[medicine.id] || [],
      medicine.timesPerDay || 1,
    )

    return {
      id: medicine.id,
      customMedicineName: medicine.customMedicineName || '',
      dosageAmount: medicine.dosageAmount ? String(medicine.dosageAmount) : '',
      dosageUnit: medicine.dosageUnit || 'TABLET',
      timesPerDay: medicine.timesPerDay ? String(medicine.timesPerDay) : '1',
      durationDays: medicine.durationDays ? String(medicine.durationDays) : '1',
      timeSlots,
    }
  })

  return {
    hospitalName: schedule.hospitalName || '',
    pharmacyName: schedule.pharmacyName || '',
    prescribedDate: schedule.prescribedDate || '',
    dispensedDate: schedule.dispensedDate || '',
    medicines: medicines.length ? medicines : [createMedicineForm()],
  }
}

export function groupTimesByMedicineId(times) {
  return times.reduce((accumulator, time) => {
    const key = time.medicationScheduleMedicineId
    if (!accumulator[key]) {
      accumulator[key] = []
    }
    accumulator[key].push(time)
    return accumulator
  }, {})
}

export function mapTimesToSlots(times, fallbackCount) {
  const ordered = [...times].sort((left, right) => left.sortOrder - right.sortOrder)

  if (!ordered.length) {
    return syncTimeSlots([], fallbackCount)
  }

  return ordered.map((time, index) => ({
    id: time.id,
    takeTime: time.takeTime,
    timing: time.timing,
    sortOrder: index + 1,
  }))
}

export function formatScheduleCardLabel(schedule) {
  const medicineCount = schedule.medicines?.length || 0
  const medicineName = schedule.customMedicineName || `Medicine #${schedule.medicineId || '-'}`
  const amount = schedule.dosageAmount ? `${schedule.dosageAmount}${schedule.dosageUnit || ''}` : '-'
  const countLabel = medicineCount > 1 ? ` 외 ${medicineCount - 1}개` : ''
  return `${medicineName}${countLabel} 쨌 ${schedule.timesPerDay || 0} times/day 쨌 ${amount}`
}
