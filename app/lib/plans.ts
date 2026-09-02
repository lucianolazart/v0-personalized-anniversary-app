import type { Plan } from "../types/plans"
import { addDays, startOfToday } from "./dates"

export const categoryEmojis: Record<Plan["category"], string> = {
  gastronomia: "🍽️",
  aire_libre: "🌳",
  entretenimiento: "🎮",
  educativo: "📚",
  otros: "✨",
}

export const categoryNames: Record<Plan["category"], string> = {
  gastronomia: "Dining",
  aire_libre: "Outdoor",
  entretenimiento: "Entertainment",
  educativo: "Educational",
  otros: "Other",
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

  const upcoming = dated.filter((plan) => plan.date && plan.date >= today)
  const highlight = upcoming[0] ?? null

  const thisWeek = dated.filter(
    (plan) =>
      plan.id !== highlight?.id &&
      plan.date &&
      plan.date < weekEnd
  )
  const later = dated.filter(
    (plan) =>
      plan.id !== highlight?.id &&
      plan.date &&
      plan.date >= weekEnd
  )

  return { highlight, thisWeek, later, ideas }
}
