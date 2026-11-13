import { cn } from "@/lib/utils"
import { shortDateParts } from "@/app/lib/dates"

/** Monospace "SÁB / 14" column at the start of list rows (design D). */
export function DateColumn({
  date,
  top = "weekday",
  highlight = false,
  className,
}: {
  date?: Date | null
  /** What goes above the day number: the weekday ("SÁB") or the month ("SEP"). */
  top?: "weekday" | "month"
  highlight?: boolean
  className?: string
}) {
  if (!date) {
    return (
      <div className={cn("w-11 shrink-0 text-center font-mono text-lg text-muted-foreground/60", className)} aria-hidden>
        —
      </div>
    )
  }
  const parts = shortDateParts(date)
  return (
    <div className={cn("w-11 shrink-0 text-center font-mono leading-tight", className)} aria-hidden>
      <p className={cn("text-[10px] font-semibold", highlight ? "text-primary" : "text-muted-foreground")}>
        {top === "weekday" ? parts.weekday : parts.month}
      </p>
      <p className="text-lg font-semibold tabular-nums">{parts.day}</p>
    </div>
  )
}
