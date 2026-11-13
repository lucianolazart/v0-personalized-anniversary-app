/** Converts a Firestore Timestamp (or a Date) read from a document into a Date. */
export function toFirestoreDate(value: { toDate?: () => Date } | Date | null | undefined) {
  if (!value) return null
  if (value instanceof Date) return value
  if (typeof value.toDate === "function") return value.toDate()
  return null
}

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
  return date.toLocaleDateString("es-AR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

export const ANNIVERSARY_MONTH = 7
export const ANNIVERSARY_DAY = 10
/** The year of the first July 10 together. */
export const TOGETHER_SINCE_YEAR = 2023

const DAY_MS = 1000 * 60 * 60 * 24

/** Whole years together, plus the days since the last anniversary. */
export function timeTogether(from = new Date()) {
  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  let lastAnniversary = new Date(from.getFullYear(), ANNIVERSARY_MONTH - 1, ANNIVERSARY_DAY)
  if (today < lastAnniversary) {
    lastAnniversary = new Date(from.getFullYear() - 1, ANNIVERSARY_MONTH - 1, ANNIVERSARY_DAY)
  }
  const years = lastAnniversary.getFullYear() - TOGETHER_SINCE_YEAR
  const days = Math.round((today.getTime() - lastAnniversary.getTime()) / DAY_MS)
  return { years: Math.max(0, years), days }
}

/** Days since the first July 10 together. */
export function daysTogether(from = new Date()) {
  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  const start = new Date(TOGETHER_SINCE_YEAR, ANNIVERSARY_MONTH - 1, ANNIVERSARY_DAY)
  return Math.max(0, Math.round((today.getTime() - start.getTime()) / DAY_MS))
}

/** Where today sits between the last anniversary and the next one (0 to 1). */
export function anniversaryProgress(from = new Date()) {
  const next = nextAnniversary(from)
  const last = new Date(next.getFullYear() - 1, ANNIVERSARY_MONTH - 1, ANNIVERSARY_DAY)
  const fraction = (from.getTime() - last.getTime()) / (next.getTime() - last.getTime())
  return {
    last,
    next,
    number: next.getFullYear() - TOGETHER_SINCE_YEAR,
    fraction: Math.min(1, Math.max(0, fraction)),
  }
}

/** "SÁB 14 NOV" style parts for the monospace date column. */
export function shortDateParts(date: Date) {
  const weekday = date.toLocaleDateString("es-AR", { weekday: "short" }).replace(".", "").toUpperCase()
  const month = date.toLocaleDateString("es-AR", { month: "short" }).replace(".", "").toUpperCase()
  return { weekday, day: date.getDate(), month }
}

/** "hoy", "mañana", "en 3 días" or "hace 2 días" relative to today. */
export function relativeDay(date: Date, from = new Date()) {
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime()
  const b = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
  const diff = Math.round((b - a) / DAY_MS)
  if (diff === 0) return "hoy"
  if (diff === 1) return "mañana"
  if (diff === -1) return "ayer"
  return diff > 0 ? `en ${diff} días` : `hace ${-diff} días`
}

export function plural(count: number, singular: string, pluralForm: string) {
  return `${count} ${count === 1 ? singular : pluralForm}`
}

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
