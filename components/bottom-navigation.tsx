"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { CalendarDays, Clapperboard, Heart, ListTodo, Moon } from "lucide-react"

import { cn } from "@/lib/utils"

const navItems = [
  { name: "Inicio", href: "/", icon: Heart },
  { name: "Pelis", href: "/movies", icon: Clapperboard },
  { name: "Noche", href: "/movie-night", icon: Moon },
  { name: "Planes", href: "/plans", icon: ListTodo },
  { name: "Calendario", href: "/calendario", icon: CalendarDays },
]

export function BottomNavigation() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Secciones"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-md pb-safe"
    >
      <div className="grid grid-cols-5 h-16 max-w-xl mx-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "relative flex flex-col items-center justify-center gap-1 transition-colors",
                isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {isActive && <span className="absolute top-0 h-0.5 w-6 rounded-full bg-primary" />}
              <item.icon className="h-5 w-5" strokeWidth={isActive ? 2 : 1.75} />
              <span className={cn("text-[11px] tracking-tight", isActive ? "font-semibold" : "font-medium")}>
                {item.name}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
