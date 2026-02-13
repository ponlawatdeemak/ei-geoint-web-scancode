// Date and time formatting utilities
import dayjs from 'dayjs'
import 'dayjs/locale/th'
import buddhistEra from 'dayjs/plugin/buddhistEra'

dayjs.extend(buddhistEra)

export function formatDate(date: Date | string, locale = 'th', full = false) {
  const d = typeof date === 'string' ? new Date(date) : date
  let formatString = full ? 'D MMMM YYYY' : 'D MMM YY'
  if (locale === 'th') {
    formatString = formatString.replace('YYYY', 'BBBB').replace('YY', 'BB')
  }
  return dayjs(d).locale(locale).format(formatString)
}

export function formatDateWithFormatString(date: Date | string, locale = 'th', formatString = 'D MMMM YYYY') {
  const d = typeof date === 'string' ? new Date(date) : date
  // let formatString = full ? 'D MMMM YYYY' : 'D MMM YY'
  if (locale === 'th') {
    formatString = formatString.replace('YYYY', 'BBBB').replace('YY', 'BB')
  }
  return dayjs(d).locale(locale).format(formatString)
}

export function formatDateTime(date: Date | string, locale = 'th', full = false) {
  const d = typeof date === 'string' ? new Date(date) : date
  return `${formatDate(d, locale, full)} ${formatTime(d)}`
}

export function formatTime(date: Date | string) {
  const d = typeof date === 'string' ? new Date(date) : date
  const hour = d.getHours().toString().padStart(2, '0')
  const minute = d.getMinutes().toString().padStart(2, '0')
  return `${hour}:${minute}`
}

export function formatDuration(
  start: Date | null | undefined,
  end: Date | null | undefined,
  t: (key: string, options?: { count: number }) => string,
) {
  if (!start || !end) return '-'
  const startDate = new Date(start)
  const endDate = new Date(end)
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return '-'

  // Ensure start <= end; if not, swap
  let from = startDate
  let to = endDate
  if (from.getTime() > to.getTime()) {
    const tmp = from
    from = to
    to = tmp
  }

  // Extract components
  let yearDiff = to.getFullYear() - from.getFullYear()
  let monthDiff = to.getMonth() - from.getMonth()
  let dayDiff = to.getDate() - from.getDate()

  // If day difference is negative, borrow days from previous month of `to`
  if (dayDiff < 0) {
    // get the year/month for the month before `to`
    const prevMonth = new Date(to.getFullYear(), to.getMonth(), 0) // day 0 -> last day of previous month
    const daysInPrevMonth = prevMonth.getDate()
    dayDiff += daysInPrevMonth
    monthDiff -= 1
  }

  // If month difference is negative, borrow years
  if (monthDiff < 0) {
    monthDiff += 12
    yearDiff -= 1
  }

  // Build result using localization
  const parts: string[] = []
  if (yearDiff > 0) parts.push(t('unit.duration.year', { count: yearDiff }))
  if (monthDiff > 0) parts.push(t('unit.duration.month', { count: monthDiff }))
  if (dayDiff > 0) parts.push(t('unit.duration.day', { count: dayDiff }))

  // If nothing (same day), return 0 days
  if (parts.length === 0) return t('unit.duration.day', { count: 0 })
  return parts.join(' ')
}

export function formatDateTimeFromMillis(ms: number | undefined, isUTC = true) {
  if (!ms) return ''
  const d = new Date(ms)
  return isUTC ? d.toISOString().slice(0, 19).replace('T', ' ') : d.toLocaleString() // Format: YYYY-MM-DD HH:mm:ss
}

export function isDateString(s: string): boolean {
  if (typeof s !== 'string') return false
  // Accept common date formats: YYYY-MM-DD, YYYY/MM/DD, YYYY-MM, ISO strings
  const dateRegex = /^(\d{4})([-\/]\d{2})([-\/]\d{2})?$/
  if (dateRegex.test(s)) return true
  const d = new Date(s)
  return !Number.isNaN(d.getTime()) && /\d{4}/.test(s)
}
