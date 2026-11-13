"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { collection, onSnapshot } from "firebase/firestore"
import { Check, ChevronLeft, ChevronRight, Heart, MapPin, Navigation } from "lucide-react"
import { db } from "../lib/firebase"
import type { MovieNight } from "../types/movie-night"
import type { Plan } from "../types/plans"
import { categoryNames, directionsUrl, isLink, planFromDoc } from "../lib/plans"
import { ANNIVERSARY_DAY, ANNIVERSARY_MONTH, toFirestoreDate, toInputDate } from "../lib/dates"
import { parseWatchedOn, watchedOnLabel } from "../lib/watched-on"
import { WatchedOnIcon } from "../components/WatchedOnPicker"
import { CategoryIcon, categoryIcon } from "../components/CategoryIcon"
import { IconButton, PageHeader, SectionLabel } from "@/components/page-header"
import { cn } from "@/lib/utils"

const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"]

type DayEvents = { nights: MovieNight[]; plans: Plan[] }

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1)
}

/** Every day shown in the month grid, Monday first, padded with the neighbouring months. */
function monthGrid(month: Date) {
  const year = month.getFullYear()
  const index = month.getMonth()
  const offset = (new Date(year, index, 1).getDay() + 6) % 7
  const daysInMonth = new Date(year, index + 1, 0).getDate()
  const cells = Math.ceil((offset + daysInMonth) / 7) * 7
  return Array.from({ length: cells }, (_, i) => new Date(year, index, 1 - offset + i))
}

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export default function CalendarPage() {
  const [nights, setNights] = useState<MovieNight[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  // "Today" only exists in the browser: the page is prerendered at build time.
  const [month, setMonth] = useState<Date | null>(null)
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    const today = new Date()
    setMonth(startOfMonth(today))
    setSelected(toInputDate(today))
  }, [])

  useEffect(() => {
    const nightsUnsub = onSnapshot(collection(db, "movieNights"), (snapshot) => {
      setNights(
        snapshot.docs.map((item) => {
          const data = item.data()
          return {
            id: item.id,
            mediaId: data.mediaId,
            title: data.title,
            year: data.year,
            image: data.image,
            date: toFirestoreDate(data.date),
            status: data.status,
            watchedOn: parseWatchedOn(data.watchedOn),
          } as MovieNight
        })
      )
      setLoading(false)
    })
    const plansUnsub = onSnapshot(collection(db, "planes"), (snapshot) => {
      setPlans(snapshot.docs.map((item) => planFromDoc(item.id, item.data())))
    })
    return () => {
      nightsUnsub()
      plansUnsub()
    }
  }, [])

  const eventsByDay = useMemo(() => {
    const map = new Map<string, DayEvents>()
    const entry = (key: string) => {
      let value = map.get(key)
      if (!value) {
        value = { nights: [], plans: [] }
        map.set(key, value)
      }
      return value
    }
    for (const night of nights) {
      if (night.date && night.status !== "queued") entry(toInputDate(night.date)).nights.push(night)
    }
    for (const plan of plans) {
      if (plan.date) entry(toInputDate(plan.date)).plans.push(plan)
    }
    return map
  }, [nights, plans])

  const days = useMemo(() => (month ? monthGrid(month) : []), [month])

  const weekends = useMemo(() => {
    if (!month) return { total: 0, free: 0 }
    const saturdays = days.filter((day) => day.getMonth() === month.getMonth() && day.getDay() === 6)
    const free = saturdays.filter((saturday) => {
      const sunday = new Date(saturday.getFullYear(), saturday.getMonth(), saturday.getDate() + 1)
      return !eventsByDay.has(toInputDate(saturday)) && !eventsByDay.has(toInputDate(sunday))
    })
    return { total: saturdays.length, free: free.length }
  }, [days, month, eventsByDay])

  if (!month || !selected) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <PageHeader title="Calendario" />
        <main className="px-5 pb-28 max-w-xl mx-auto" aria-busy>
          <div className="mt-6 h-[420px] rounded-xl bg-muted/60 animate-pulse" />
        </main>
      </div>
    )
  }

  const todayKey = toInputDate(new Date())
  const isCurrentMonth = startOfMonth(new Date()).getTime() === month.getTime()
  const [selYear, selMonth, selDay] = selected.split("-").map(Number)
  const selectedDate = new Date(selYear, selMonth - 1, selDay)
  const selectedEvents = eventsByDay.get(selected)

  const goToMonth = (next: Date) => {
    setMonth(next)
    const today = new Date()
    setSelected(toInputDate(startOfMonth(today).getTime() === next.getTime() ? today : next))
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageHeader
        title="Calendario"
        actions={
          <>
            <IconButton aria-label="Mes anterior" onClick={() => goToMonth(addMonths(month, -1))}>
              <ChevronLeft className="h-[18px] w-[18px]" />
            </IconButton>
            <IconButton aria-label="Mes siguiente" onClick={() => goToMonth(addMonths(month, 1))}>
              <ChevronRight className="h-[18px] w-[18px]" />
            </IconButton>
          </>
        }
      />

      <main className="px-5 pb-28 max-w-xl mx-auto">
        <div className="mt-3 flex items-baseline justify-between gap-3">
          <p className="text-xl font-semibold tracking-[-0.02em]">
            {capitalize(month.toLocaleDateString("es-AR", { month: "long" }))} {month.getFullYear()}
          </p>
          {isCurrentMonth ? (
            <p className="font-mono text-[11px] font-semibold uppercase text-primary">
              {weekends.free === 0 ? "Todos los findes tienen algo" : `${weekends.free} de ${weekends.total} findes libres`}
            </p>
          ) : (
            <button
              type="button"
              onClick={() => goToMonth(startOfMonth(new Date()))}
              className="font-mono text-[11px] font-semibold uppercase text-primary"
            >
              Volver a hoy
            </button>
          )}
        </div>
        {!isCurrentMonth && (
          <p className="mt-1 font-mono text-[11px] uppercase text-muted-foreground">
            {weekends.free === 0 ? "Todos los findes tienen algo" : `${weekends.free} de ${weekends.total} findes libres`}
          </p>
        )}

        <div className="mt-4 grid grid-cols-7 gap-1 border-b border-border pb-1.5">
          {WEEKDAYS.map((label, index) => (
            <p
              key={index}
              className={cn("text-center font-mono text-[11px]", index >= 5 ? "text-primary" : "text-muted-foreground")}
            >
              {label}
            </p>
          ))}
        </div>

        <div className="mt-1.5 grid grid-cols-7 gap-1">
          {days.map((day) => {
            const key = toInputDate(day)
            const events = eventsByDay.get(key)
            const inMonth = day.getMonth() === month.getMonth()
            const weekend = day.getDay() === 0 || day.getDay() === 6
            const anniversary = day.getMonth() === ANNIVERSARY_MONTH - 1 && day.getDate() === ANNIVERSARY_DAY
            const night = events?.nights[0]
            const firstPlan = events?.plans[0]
            const PlanIcon = firstPlan ? categoryIcon(firstPlan.category) : null
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelected(key)}
                aria-label={day.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}
                aria-pressed={selected === key}
                className={cn(
                  "relative h-[66px] rounded-lg pt-1 flex flex-col items-center gap-1 border-[1.5px] transition-colors",
                  weekend ? "bg-accent" : "bg-transparent",
                  !inMonth && "opacity-35",
                  selected === key ? "border-foreground" : "border-transparent hover:bg-muted"
                )}
              >
                <span
                  className={cn(
                    "h-5 min-w-5 px-1 rounded-full font-mono text-xs leading-5 tabular-nums",
                    key === todayKey ? "bg-primary text-primary-foreground font-semibold" : "font-medium"
                  )}
                >
                  {day.getDate()}
                </span>
                {night ? (
                  <img
                    src={night.image || "/placeholder.svg?height=450&width=300"}
                    alt=""
                    className={cn(
                      "h-[34px] w-[23px] rounded-[3px] object-cover",
                      night.status === "watched" && "grayscale-[40%]"
                    )}
                  />
                ) : PlanIcon ? (
                  <PlanIcon className="mt-1 h-4 w-4 text-foreground/80" strokeWidth={1.75} aria-hidden />
                ) : anniversary ? (
                  <Heart className="mt-1 h-4 w-4 text-primary fill-primary" aria-hidden />
                ) : null}
                {night && firstPlan && (
                  <span className="absolute bottom-1 right-1 h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
                )}
              </button>
            )
          })}
        </div>

        <section className="mt-6">
          <SectionLabel>
            {selectedDate.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}
          </SectionLabel>

          {loading ? (
            <div className="mt-3 h-16 rounded-lg bg-muted animate-pulse" />
          ) : !selectedEvents ? (
            <div className="flex items-center justify-between gap-3 py-3.5 border-b border-border">
              <p className="text-sm text-muted-foreground">Día libre</p>
              <div className="flex gap-4">
                <Link href="/plans?nuevo=1" className="text-[13px] font-semibold text-primary">
                  + Plan
                </Link>
                <Link href="/movie-night?nuevo=1" className="text-[13px] font-semibold text-primary">
                  + Peli
                </Link>
              </div>
            </div>
          ) : (
            <div>
              {selectedEvents.nights.map((night) => (
                <Link key={night.id} href="/movie-night" className="flex items-center gap-3.5 py-3 border-b border-border">
                  <img
                    src={night.image || "/placeholder.svg?height=450&width=300"}
                    alt=""
                    className="h-[54px] w-9 shrink-0 rounded object-cover bg-muted"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-primary">
                      {night.status !== "watched"
                        ? "Noche de peli"
                        : night.watchedOn
                          ? `Noche de peli · vista ${watchedOnLabel(night.watchedOn)}`
                          : "Noche de peli · vista"}
                    </p>
                    <p className="text-base font-semibold truncate">{night.title}</p>
                    <p className="font-mono text-[11px] text-muted-foreground">{night.year}</p>
                  </div>
                  {night.watchedOn && <WatchedOnIcon value={night.watchedOn} size="lg" />}
                </Link>
              ))}
              {selectedEvents.plans.map((plan) => (
                <div key={plan.id} className="py-3 border-b border-border">
                  <Link href="/plans" className="flex items-start gap-3.5">
                    <CategoryIcon category={plan.category} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-primary flex items-center gap-1">
                        {plan.completed && <Check className="h-3 w-3" />}
                        {plan.completed ? "Plan hecho" : "Plan"} · {categoryNames[plan.category]}
                      </p>
                      <p
                        className={cn(
                          "text-base font-semibold leading-tight",
                          plan.completed && "line-through text-muted-foreground"
                        )}
                      >
                        {plan.title}
                      </p>
                    </div>
                  </Link>
                  {plan.location && (
                    <div className="mt-2 flex items-center justify-between gap-3 pl-[50px] text-[13px]">
                      <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{isLink(plan.location) ? "Ubicación en Maps" : plan.location}</span>
                      </span>
                      <a
                        href={directionsUrl(plan.location)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 inline-flex items-center gap-1 font-semibold text-primary"
                      >
                        <Navigation className="h-3.5 w-3.5" />
                        Cómo llegar
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
