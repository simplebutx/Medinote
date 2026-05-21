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

  if (/[zZ]$|[+-]\d{2}:\d{2}$/.test(value)) {
    return new Date(value)
  }

  return new Date(`${value}Z`)
}

function getDoseTimesForDate(schedule, scheduleTimes, targetDate) {
  const { startDate, endDate } = getEffectiveScheduleWindow(schedule, scheduleTimes)

  if (!startDate || !endDate || targetDate < startDate || targetDate > endDate) {
    return []
  }

  const orderedTimes = [...scheduleTimes]
    .map((time) => normalizeTakeTime(time.takeTime))
    .filter(Boolean)
    .sort()

  if (!orderedTimes.length) {
    return []
  }

  const createdAt = parseServerDateTime(schedule.createdAt)
  const createdAtDate = createdAt && !Number.isNaN(createdAt.getTime()) ? formatIsoDate(createdAt) : null
  const createdAtTime = createdAt
    ? `${String(createdAt.getHours()).padStart(2, '0')}:${String(createdAt.getMinutes()).padStart(2, '0')}`
    : null

  const firstDayTimes =
    createdAtDate === startDate && createdAtTime
      ? orderedTimes.filter((takeTime) => takeTime >= createdAtTime)
      : orderedTimes

  const totalDailySlots = orderedTimes.length
  const totalDoseCount = Math.max(Number(schedule.durationDays) || 1, 1) * totalDailySlots

  let remainingDoses = totalDoseCount
  let currentDate = schedule.startDate

  while (remainingDoses > 0) {
    const dayTimes = currentDate === startDate ? firstDayTimes : orderedTimes
    const visibleTimes = dayTimes.slice(0, remainingDoses)

    if (currentDate === targetDate) {
      return visibleTimes
    }

    remainingDoses -= visibleTimes.length
    currentDate = formatIsoDate(new Date(`${currentDate}T00:00:00`))

    const nextDate = new Date(`${currentDate}T00:00:00`)
    nextDate.setDate(nextDate.getDate() + 1)
    currentDate = formatIsoDate(nextDate)
  }

  return []
}

function getEffectiveScheduleWindow(schedule, scheduleTimes) {
  const orderedTimes = [...scheduleTimes]
    .map((time) => normalizeTakeTime(time.takeTime))
    .filter(Boolean)
    .sort()

  const createdAt = parseServerDateTime(schedule.createdAt)
  const createdAtDate = createdAt && !Number.isNaN(createdAt.getTime()) ? formatIsoDate(createdAt) : null
  const createdAtTime = createdAt
    ? `${String(createdAt.getHours()).padStart(2, '0')}:${String(createdAt.getMinutes()).padStart(2, '0')}`
    : null

  const fallbackStartDate = schedule.startDate || createdAtDate
  if (!fallbackStartDate) {
    return {
      startDate: null,
      endDate: null,
    }
  }

  if (!orderedTimes.length) {
    return {
      startDate: fallbackStartDate,
      endDate: schedule.endDate || fallbackStartDate,
    }
  }

  const firstAvailableToday =
    createdAtDate === fallbackStartDate && createdAtTime
      ? orderedTimes.filter((takeTime) => takeTime >= createdAtTime)
      : orderedTimes

  const startDate =
    firstAvailableToday.length > 0
      ? fallbackStartDate
      : formatIsoDate(new Date(`${fallbackStartDate}T00:00:00`))

  const normalizedStartDate =
    firstAvailableToday.length > 0
      ? startDate
      : (() => {
          const nextDate = new Date(`${fallbackStartDate}T00:00:00`)
          nextDate.setDate(nextDate.getDate() + 1)
          return formatIsoDate(nextDate)
        })()

  const totalDailySlots = orderedTimes.length
  const totalDoseCount = Math.max(Number(schedule.durationDays) || 1, 1) * totalDailySlots
  const firstDayDoseCount =
    normalizedStartDate === fallbackStartDate ? Math.max(firstAvailableToday.length, 1) : totalDailySlots

  let remainingDoses = totalDoseCount
  let currentDate = normalizedStartDate

  while (remainingDoses > 0) {
    const dayTimes = currentDate === normalizedStartDate ? firstDayDoseCount : totalDailySlots
    remainingDoses -= Math.min(remainingDoses, Math.max(dayTimes, 1))

    if (remainingDoses > 0) {
      const nextDate = new Date(`${currentDate}T00:00:00`)
      nextDate.setDate(nextDate.getDate() + 1)
      currentDate = formatIsoDate(nextDate)
    }
  }

  return {
    startDate: normalizedStartDate,
    endDate: currentDate,
  }
}

export { WEEKDAY_LABELS, buildCalendarDays, formatIsoDate, getDaySummaryLabel, getDoseTimesForDate, getEffectiveScheduleWindow }
