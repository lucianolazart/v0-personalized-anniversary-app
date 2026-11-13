import * as React from "react"
import { cn } from "@/lib/utils"

/** Page title block shared by every section (design D). */
export function PageHeader({
  title,
  eyebrow,
  actions,
}: {
  title: string
  eyebrow?: React.ReactNode
  actions?: React.ReactNode
}) {
  return (
    <header className="px-5 pt-12 pb-2 flex items-start justify-between gap-3 max-w-xl mx-auto w-full">
      <div className="min-w-0">
        {eyebrow && <p className="label-mono mb-1">{eyebrow}</p>}
        <h1 className="text-[28px] leading-tight font-semibold tracking-[-0.03em]">{title}</h1>
      </div>
      {actions && <div className="flex gap-2 shrink-0">{actions}</div>}
    </header>
  )
}

/** Square 40px outlined icon button used in headers. */
export const IconButton = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  function IconButton({ className, type = "button", ...props }, ref) {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          "relative h-10 w-10 shrink-0 inline-flex items-center justify-center rounded-[10px] border border-border bg-card text-foreground transition-colors hover:bg-muted",
          className
        )}
        {...props}
      />
    )
  }
)

/** Uppercase monospace section label with an optional count, over a hairline. */
export function SectionLabel({
  children,
  count,
  tone = "muted",
  action,
}: {
  children: React.ReactNode
  count?: number
  tone?: "muted" | "primary"
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-3 pb-2 border-b border-border">
      <p className={cn("label-mono", tone === "primary" && "text-primary font-semibold")}>
        {children}
        {count !== undefined && <span> · {count}</span>}
      </p>
      {action}
    </div>
  )
}
