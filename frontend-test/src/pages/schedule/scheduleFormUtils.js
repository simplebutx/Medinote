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

export function createDefaultScheduleForm() {
  return {
    customMedicineName: '',
    hospitalName: '',
    pharmacyName: '',
    dosageAmount: '1',
    dosageUnit: 'TABLET',
    timesPerDay: '3',
    durationDays: '7',
    prescribedDate: '',
    dispensedDate: '',
  }
}

export function normalizeTimesPerDay(value) {
  const parsed = Number(value)

  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1
  }

  return Math.min(parsed, MAX_TIMES_PER_DAY)
}

export function buildSchedulePayload(form) {
  const timesPerDay = normalizeTimesPerDay(form.timesPerDay)
  const durationDays = Math.max(1, Number(form.durationDays) || 1)

  return {
    medicineId: null,
    customMedicineName: form.customMedicineName || null,
    hospitalName: form.hospitalName || null,
    pharmacyName: form.pharmacyName || null,
    dosageAmount: form.dosageAmount ? Number(form.dosageAmount) : null,
    dosageUnit: form.dosageUnit || null,
    frequencyType: 'DAILY',
    timesPerDay,
    intervalHours: null,
    durationDays,
    startDate: null,
    endDate: null,
    prescribedDate: form.prescribedDate || null,
    dispensedDate: form.dispensedDate || null,
    isActive: null,
  }
}

export function buildTimePayload(slot, scheduleId, index) {
  return {
    medicationScheduleId: scheduleId,
    timing: slot.timing,
    takeTime: slot.takeTime,
    sortOrder: index + 1,
  }
}

export function mapScheduleToForm(schedule) {
  return {
    customMedicineName: schedule.customMedicineName || '',
    hospitalName: schedule.hospitalName || '',
    pharmacyName: schedule.pharmacyName || '',
    dosageAmount: schedule.dosageAmount ? String(schedule.dosageAmount) : '',
    dosageUnit: schedule.dosageUnit || 'TABLET',
    timesPerDay: schedule.timesPerDay ? String(schedule.timesPerDay) : '1',
    durationDays: schedule.durationDays ? String(schedule.durationDays) : '1',
    prescribedDate: schedule.prescribedDate || '',
    dispensedDate: schedule.dispensedDate || '',
  }
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
  const medicineName = schedule.customMedicineName || `Medicine #${schedule.medicineId || '-'}`
  const amount = schedule.dosageAmount ? `${schedule.dosageAmount}${schedule.dosageUnit || ''}` : '-'
  return `${medicineName} · ${schedule.timesPerDay || 0} times/day · ${amount}`
}
