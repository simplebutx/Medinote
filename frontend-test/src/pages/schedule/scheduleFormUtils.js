import { MAX_TIMES_PER_DAY } from './constants'

const DEFAULT_TIME_SEQUENCE = [
  '08:00',
  '10:00',
  '12:00',
  '13:00',
  '15:00',
  '18:00',
  '20:00',
  '21:00',
  '22:00',
  '23:00',
  '07:00',
  '09:00',
]

const DOSAGE_UNIT_MATCHERS = [
  { pattern: /(ml|mL)/i, unit: 'ML' },
  { pattern: /mg/i, unit: 'MG' },
  { pattern: /(정|tablet|tab)/i, unit: 'TABLET' },
  { pattern: /(포|packet|pack)/i, unit: 'PACKET' },
  { pattern: /(스푼|숟갈|tsp|spoon)/i, unit: 'SPOON' },
]

export function createTimeSlot(index) {
  return {
    takeTime: DEFAULT_TIME_SEQUENCE[index] || '',
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
    timeSlots: syncTimeSlots([], 3),
  }
}

export function createDefaultScheduleForm() {
  return {
    hospitalName: '',
    pharmacyName: '',
    dispensedDate: '',
    medicines: [createMedicineForm()],
  }
}

export function buildPrescriptionFileName() {
  const now = new Date()
  const pad = (value) => String(value).padStart(2, '0')

  return `prescription-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(
    now.getHours(),
  )}${pad(now.getMinutes())}${pad(now.getSeconds())}.jpg`
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

function normalizeDateString(value) {
  const raw = String(value || '').trim()

  if (!raw) {
    return ''
  }

  const digits = raw.replace(/[^\d]/g, '')
  if (digits.length === 8) {
    return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`
  }

  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const pad = (part) => String(part).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function extractFirstNumber(text, fallback) {
  const match = String(text || '').match(/(\d+(?:\.\d+)?)/)
  return match ? match[1] : fallback
}

function inferDosageUnit(text) {
  const raw = String(text || '')
  const matched = DOSAGE_UNIT_MATCHERS.find((candidate) => candidate.pattern.test(raw))
  return matched?.unit || 'TABLET'
}

function inferTimesPerDay(text) {
  return String(normalizeTimesPerDay(extractFirstNumber(text, '3')))
}

function inferDurationDays(text) {
  return String(normalizeDurationDays(extractFirstNumber(text, '7')))
}

function mapOcrMedicineToForm(medicine) {
  const timesPerDay = inferTimesPerDay(medicine.frequency)

  return {
    customMedicineName: medicine.name || '',
    dosageAmount: extractFirstNumber(medicine.dosage, '1'),
    dosageUnit: inferDosageUnit(medicine.dosage),
    timesPerDay,
    durationDays: inferDurationDays(medicine.days),
    timeSlots: syncTimeSlots([], Number(timesPerDay)),
  }
}

export function buildOcrScheduleDraft(resultJson) {
  if (!resultJson) {
    return null
  }

  try {
    const parsed = JSON.parse(resultJson)
    const medicines = Array.isArray(parsed.medicines)
      ? parsed.medicines
          .map((medicine) => ({
            name: String(medicine?.name || '').trim(),
            dosage: String(medicine?.dosage || '').trim(),
            frequency: String(medicine?.frequency || '').trim(),
            days: String(medicine?.days || '').trim(),
          }))
          .filter((medicine) => medicine.name)
      : []

    if (!medicines.length) {
      return null
    }

    return {
      hospitalName: String(parsed.hospitalName || '').trim(),
      pharmacyName: String(parsed.pharmacyName || '').trim(),
      dispensedDate: normalizeDateString(parsed.dispensedDate),
      medicines,
    }
  } catch {
    return null
  }
}

export function applyOcrDraftToForm(previousForm, draft) {
  const medicines = (draft?.medicines || []).map(mapOcrMedicineToForm)

  return {
    ...previousForm,
    hospitalName: draft?.hospitalName || '',
    pharmacyName: draft?.pharmacyName || '',
    dispensedDate: draft?.dispensedDate || '',
    medicines: medicines.length ? medicines : [createMedicineForm()],
  }
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
    const timeSlots = mapTimesToSlots(groupedTimes[medicine.id] || [], medicine.timesPerDay || 1)

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
  const countLabel = medicineCount > 1 ? ` +${medicineCount - 1}` : ''
  return `${medicineName}${countLabel} - ${schedule.timesPerDay || 0} times/day - ${amount}`
}
