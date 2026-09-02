import type { GroceryAisle } from "../types/groceries"
import { aisleIcons, aisleNames, resolveGroceryEmoji } from "../lib/groceries"
import { cn } from "@/lib/utils"

type GroceryIconProps = {
  aisle: GroceryAisle
  name?: string
  emoji?: string | null
  size?: "sm" | "md" | "lg"
  className?: string
}

const sizeClass = {
  sm: "h-8 w-8",
  md: "h-14 w-14",
  lg: "aspect-square w-full",
} as const

const iconSize = {
  sm: "h-3.5 w-3.5",
  md: "h-6 w-6",
  lg: "h-8 w-8",
} as const

const emojiSize = {
  sm: "text-base",
  md: "text-2xl",
  lg: "text-3xl",
} as const

export function GroceryIcon({ aisle, name, emoji, size = "md", className }: GroceryIconProps) {
  const resolved = resolveGroceryEmoji(name ?? "", emoji)
  const Icon = aisleIcons[aisle]

  return (
    <div
      className={cn(
        "inline-flex items-center justify-center rounded-md border border-border bg-primary/10 text-primary",
        sizeClass[size],
        className
      )}
      aria-label={name || aisleNames[aisle]}
    >
      {resolved ? (
        <span className={cn("leading-none", emojiSize[size])}>{resolved}</span>
      ) : (
        <Icon className={iconSize[size]} strokeWidth={1.75} />
      )}
    </div>
  )
}
