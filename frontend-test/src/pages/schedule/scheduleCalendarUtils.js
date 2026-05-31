const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function formatIsoDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function buildCalendarDays(referenceMonth, schedules) {
  const year = referenceMonth.getFullYear()
  const month = referenceMonth.getMonth()
  const firstDay = new Date(year, month, 1)
  const gridStart = new Date(firstDay)
  gridStart.setDate(firstDay.getDate() - firstDay.getDay())

  return Array.from({ length: 42 }, (_, index) => {
    const current = new Date(gridStart)
    current.setDate(gridStart.getDate() + index)
    const isoDate = formatIsoDate(current)
    const matchingSchedules = schedules.filter((schedule) => {
      if (!schedule.effectiveStartDate || !schedule.effectiveEndDate) {
        return false
      }

      return schedule.effectiveStartDate <= isoDate && schedule.effectiveEndDate >= isoDate
    })

    return {
      isoDate,
      dayNumber: current.getDate(),
      isCurrentMonth: current.getMonth() === month,
      isToday: isoDate === formatIsoDate(new Date()),
      schedules: matchingSchedules,
    }
  })
}

function getDaySummaryLabel(schedule) {
  return schedule.customMedicineName || `Medicine #${schedule.medicineId || '-'}`
}

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

  const normalized = String(value)
    .trim()
    .replace(' ', 'T')
    .replace(/\.(\d{3})\d+/, '.$1')

  if (/[zZ]$|[+-]\d{2}:\d{2}$/.test(normalized)) {
    return new Date(normalized)
  }

  return new Date(normalized)
}

function addDays(isoDate, days) {
  const nextDate = new Date(`${isoDate}T00:00:00`)
  nextDate.setDate(nextDate.getDate() + days)
  return formatIsoDate(nextDate)
}

function resolveAnchorDate(schedule) {
  const createdAt = resolveScheduleCreatedAt(schedule)
  const createdAtDate = createdAt && !Number.isNaN(createdAt.getTime()) ? formatIsoDate(createdAt) : null
  return schedule.dispensedDate || createdAtDate || schedule.startDate || null
}

function resolveScheduleCreatedAt(schedule) {
  const candidates = [
    schedule.createdAt,
    ...(schedule.medicines || []).map((medicine) => medicine.createdAt),
  ]

  for (const candidate of candidates) {
    const parsed = parseServerDateTime(candidate)
    if (parsed && !Number.isNaN(parsed.getTime())) {
      return parsed
    }
  }

  return null
}

function calculateScheduleWindowDetails(schedule, scheduleTimes) {
  const anchorDate = resolveAnchorDate(schedule)
  const orderedTimes = [...scheduleTimes]
    .map((time) => normalizeTakeTime(time.takeTime))
    .filter(Boolean)
    .sort()
  const durationDays = Math.max(Number(schedule.durationDays) || 1, 1)
  const createdAt = resolveScheduleCreatedAt(schedule)
  const createdAtDate = createdAt && !Number.isNaN(createdAt.getTime()) ? formatIsoDate(createdAt) : null
  const createdAtTime = createdAt
    ? `${String(createdAt.getHours()).padStart(2, '0')}:${String(createdAt.getMinutes()).padStart(2, '0')}`
    : null
  const now = new Date()
  const todayDate = formatIsoDate(now)
  const nowTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

  if (!anchorDate) {
    return {
      startDate: null,
      endDate: null,
      firstDayTimes: [],
      lastDayTimes: [],
      orderedTimes,
    }
  }

  if (!orderedTimes.length) {
    return {
      startDate: anchorDate,
      endDate: addDays(anchorDate, durationDays - 1),
      firstDayTimes: [],
      lastDayTimes: [],
      orderedTimes,
    }
  }

  let startDate = anchorDate
  let firstDayTimes = orderedTimes

  const firstDayReferenceTime =
    anchorDate === todayDate
      ? nowTime
      : createdAtDate === anchorDate && createdAtTime
      ? createdAtTime
      : null

  if (firstDayReferenceTime) {
    const remainingTimes = orderedTimes.filter((takeTime) => takeTime >= firstDayReferenceTime)
    if (remainingTimes.length) {
      firstDayTimes = remainingTimes
    } else {
      startDate = addDays(anchorDate, 1)
      firstDayTimes = orderedTimes
    }
  }

  const totalDoseCount = durationDays * orderedTimes.length
  let remainingDoseCount = totalDoseCount
  let cursorDate = startDate
  let lastDayTimes = firstDayTimes

  while (remainingDoseCount > 0) {
    const availableTimes = cursorDate === startDate ? firstDayTimes : orderedTimes
    const consumedToday = Math.min(remainingDoseCount, Math.max(availableTimes.length, 1))
    lastDayTimes = availableTimes.slice(0, consumedToday)
    remainingDoseCount -= consumedToday

    if (remainingDoseCount > 0) {
      cursorDate = addDays(cursorDate, 1)
    }
  }

  return {
    startDate,
    endDate: cursorDate,
    firstDayTimes,
    lastDayTimes,
    orderedTimes,
  }
}

function getDoseTimesForDate(schedule, scheduleTimes, targetDate) {
  const { startDate, endDate, firstDayTimes, lastDayTimes, orderedTimes } =
    calculateScheduleWindowDetails(schedule, scheduleTimes)

  if (!startDate || !endDate || targetDate < startDate || targetDate > endDate) {
    return []
  }

  if (!orderedTimes.length) {
    return []
  }

  if (startDate === endDate) {
    return targetDate === startDate ? lastDayTimes : []
  }

  if (targetDate === startDate) {
    return firstDayTimes
  }

  if (targetDate === endDate) {
    return lastDayTimes
  }

  return orderedTimes
}

function getEffectiveScheduleWindow(schedule, scheduleTimes) {
  const { startDate, endDate } = calculateScheduleWindowDetails(schedule, scheduleTimes)
  return { startDate, endDate }
}

export { WEEKDAY_LABELS, buildCalendarDays, formatIsoDate, getDaySummaryLabel, getDoseTimesForDate, getEffectiveScheduleWindow }
