import type { DocumentData } from "firebase/firestore"
import type { Plan } from "../types/plans"
import { addDays, startOfToday, toFirestoreDate } from "./dates"

export const categoryEmojis: Record<Plan["category"], string> = {
  gastronomia: "🍽️",
  aire_libre: "🌳",
  entretenimiento: "🎮",
  educativo: "📚",
  otros: "✨",
}

export const categoryNames: Record<Plan["category"], string> = {
  gastronomia: "Gastronomía",
  aire_libre: "Aire libre",
  entretenimiento: "Entretenimiento",
  educativo: "Educativo",
  otros: "Otros",
}

/** Maps a `planes` document to a Plan, converting Timestamps and dropping empty optional fields. */
export function planFromDoc(id: string, data: DocumentData): Plan {
  return {
    ...(data as Omit<Plan, "id">),
    id,
    date: toFirestoreDate(data.date) ?? undefined,
    completedAt: toFirestoreDate(data.completedAt) ?? undefined,
    location: typeof data.location === "string" && data.location.trim() ? data.location.trim() : undefined,
  }
}

export function isLink(value: string) {
  return /^https?:\/\//i.test(value.trim())
}

/** A Maps link opens as is; an address opens Google Maps directions to it. */
export function directionsUrl(location: string) {
  const value = location.trim()
  if (isLink(value)) return value
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(value)}`
}

export function nextActivePlan(plans: Plan[], from = startOfToday()) {
  return plans
    .filter((plan) => !plan.completed && plan.date && plan.date >= from)
    .sort((a, b) => (a.date?.getTime() ?? 0) - (b.date?.getTime() ?? 0))[0] ?? null
}

export function groupActivePlans(plans: Plan[]) {
  const today = startOfToday()
  const weekEnd = addDays(today, 7)
  const active = plans.filter((plan) => !plan.completed)
  const ideas = active.filter((plan) => !plan.date)
  const dated = active
    .filter((plan) => plan.date)
    .sort((a, b) => (a.date?.getTime() ?? 0) - (b.date?.getTime() ?? 0))

  // Dated plans already in the past that nobody marked as done: ask what happened.
  const overdue = dated
    .filter((plan) => plan.date && plan.date < today)
    .sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0))

  const upcoming = dated.filter((plan) => plan.date && plan.date >= today)
  const highlight = upcoming[0] ?? null
  const rest = upcoming.filter((plan) => plan.id !== highlight?.id)

  const thisWeek = rest.filter((plan) => plan.date && plan.date < weekEnd)
  const later = rest.filter((plan) => plan.date && plan.date >= weekEnd)

  return { overdue, highlight, thisWeek, later, ideas }
}
