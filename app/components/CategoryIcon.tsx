import { BookOpen, Gamepad2, Sparkles, Trees, UtensilsCrossed, type LucideIcon } from "lucide-react"
import type { Plan } from "../types/plans"
import { cn } from "@/lib/utils"

const ICONS: Record<Plan["category"], LucideIcon> = {
  gastronomia: UtensilsCrossed,
  aire_libre: Trees,
  entretenimiento: Gamepad2,
  educativo: BookOpen,
  otros: Sparkles,
}

/** Line icon for a plan category inside a small outlined square (design D). */
export function CategoryIcon({
  category,
  size = "md",
  className,
}: {
  category: Plan["category"]
  size?: "sm" | "md"
  className?: string
}) {
  const Icon = ICONS[category] ?? Sparkles
  return (
    <span
      className={cn(
        "shrink-0 inline-flex items-center justify-center rounded-lg border border-border bg-card text-foreground",
        size === "md" ? "h-9 w-9" : "h-6 w-6 rounded-md",
        className
      )}
      aria-hidden
    >
      <Icon className={size === "md" ? "h-[18px] w-[18px]" : "h-3.5 w-3.5"} strokeWidth={1.75} />
    </span>
  )
}

export function categoryIcon(category: Plan["category"]) {
  return ICONS[category] ?? Sparkles
}
