const APP_TIME_ZONE = 'Europe/London'
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const MONTH_PATTERN = /^\d{4}-\d{2}$/

export function todayDate() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: APP_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())

  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${value.year}-${value.month}-${value.day}`
}

export function validDate(value: string | undefined) {
  if (!value || !DATE_PATTERN.test(value)) return null
  const date = new Date(`${value}T00:00:00Z`)
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value
    ? null
    : value
}

export function shiftDate(value: string, days: number) {
  const date = new Date(`${value}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

export function displayDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value}T00:00:00Z`))
}

export function validMonth(value: string | undefined) {
  if (!value || !MONTH_PATTERN.test(value)) return null
  return validDate(`${value}-01`) ? value : null
}

export function shiftMonth(value: string, months: number) {
  const date = new Date(`${value}-01T00:00:00Z`)
  date.setUTCMonth(date.getUTCMonth() + months)
  return date.toISOString().slice(0, 7)
}

export function monthDetails(value: string) {
  const firstDate = `${value}-01`
  const first = new Date(`${firstDate}T00:00:00Z`)
  const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0))

  return {
    firstDate,
    lastDate: last.toISOString().slice(0, 10),
    daysInMonth: last.getUTCDate(),
    leadingDays: (first.getUTCDay() + 6) % 7,
    label: new Intl.DateTimeFormat('en-GB', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(first),
  }
}
