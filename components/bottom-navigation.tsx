"use client"

import { usePathname, useRouter } from "next/navigation"
import { CalendarHeart, Clapperboard, Clock, GamepadIcon } from "lucide-react"

import { cn } from "@/lib/utils"

export function BottomNavigation() {
  const router = useRouter()
  const pathname = usePathname()

  const navItems = [
    {
      name: "Línea de Tiempo",
      href: "/timeline",
      icon: Clock,
    },
    {
      name: "Trivia",
      href: "/trivia",
      icon: GamepadIcon,
    },
    {
      name: "Diario",
      href: "/diary",
      icon: CalendarHeart,
    },
    {
      name: "Películas",
      href: "/movies",
      icon: Clapperboard,
    },
  ]

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800 shadow-lg">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full transition-colors",
                isActive
                  ? "text-rose-500 dark:text-rose-400"
                  : "text-gray-500 dark:text-gray-400 hover:text-rose-400 dark:hover:text-rose-300",
              )}
            >
              {isActive ? <div className="absolute top-0 w-1/4 h-0.5 bg-rose-500 dark:bg-rose-400" /> : null}
              <item.icon className="h-5 w-5 mb-1" />
              <span className="text-xs font-medium">{item.name}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
