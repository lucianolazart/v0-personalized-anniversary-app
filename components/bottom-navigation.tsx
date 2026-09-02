"use client"

import { usePathname, useRouter } from "next/navigation"
import { Clapperboard, Heart, ListTodo, Moon, ShoppingBasket } from "lucide-react"

import { cn } from "@/lib/utils"

export function BottomNavigation() {
  const router = useRouter()
  const pathname = usePathname()

  const navItems = [
    {
      name: "Home",
      href: "/",
      icon: Heart,
    },
    {
      name: "Movies",
      href: "/movies",
      icon: Clapperboard,
    },
    {
      name: "Night",
      href: "/movie-night",
      icon: Moon,
    },
    {
      name: "Plans",
      href: "/plans",
      icon: ListTodo,
    },
    {
      name: "Shop",
      href: "/shop",
      icon: ShoppingBasket,
    },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/90 backdrop-blur-md pb-safe">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={cn(
                "relative flex flex-col items-center justify-center w-full h-full transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {isActive ? (
                <span className="absolute top-0 w-8 h-0.5 rounded-full bg-primary" />
              ) : null}
              <item.icon className="h-5 w-5 mb-1" />
              <span className="text-[11px] font-medium tracking-wide">{item.name}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
