export function parseLocalDate(value: string) {
  const [year, month, day] = value.split("-").map(Number)
  return new Date(year, month - 1, day)
}

export function toInputDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function startOfToday() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return today
}

export function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  next.setHours(0, 0, 0, 0)
  return next
}

export function formatDisplayDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

export const ANNIVERSARY_MONTH = 7
export const ANNIVERSARY_DAY = 10

export function nextAnniversary(from = new Date()) {
  const year = from.getFullYear()
  const start = new Date(year, ANNIVERSARY_MONTH - 1, ANNIVERSARY_DAY, 0, 0, 0, 0)
  const end = new Date(year, ANNIVERSARY_MONTH - 1, ANNIVERSARY_DAY, 23, 59, 59, 999)
  if (from <= end) return start
  return new Date(year + 1, ANNIVERSARY_MONTH - 1, ANNIVERSARY_DAY, 0, 0, 0, 0)
}

export function isAnniversaryToday(from = new Date()) {
  return from.getMonth() === ANNIVERSARY_MONTH - 1 && from.getDate() === ANNIVERSARY_DAY
}

export function countdownParts(target: Date, from = new Date()) {
  const diff = Math.max(0, target.getTime() - from.getTime())
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24)
  const minutes = Math.floor((diff / (1000 * 60)) % 60)
  return { days, hours, minutes }
}
