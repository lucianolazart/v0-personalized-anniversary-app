"use client"

import { usePathname, useRouter } from "next/navigation"
import { Clapperboard, ListTodo } from "lucide-react"

import { cn } from "@/lib/utils"

export function BottomNavigation() {
  const router = useRouter()
  const pathname = usePathname()

  const navItems = [
    {
      name: "Movies",
      href: "/movies",
      icon: Clapperboard,
    },
    {
      name: "Plans",
      href: "/plans",
      icon: ListTodo,
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
                  ? "text-[#EA580C] dark:text-[#FB923C]"
                  : "text-gray-500 dark:text-gray-400 hover:text-[#FB923C] dark:hover:text-[#FDBA74]",
              )}
            >
              {isActive ? <div className="absolute top-0 w-1/4 h-0.5 bg-[#EA580C] dark:bg-orange-400" /> : null}
              <item.icon className="h-5 w-5 mb-1" />
              <span className="text-xs font-medium">{item.name}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
