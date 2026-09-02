"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { collection, onSnapshot } from "firebase/firestore"
import { Calendar, Clapperboard } from "lucide-react"
import { db } from "./lib/firebase"
import type { MovieNight } from "./types/movie-night"
import type { Plan } from "./types/plans"
import { nextScheduledNight } from "./lib/movie-night"
import { categoryEmojis, categoryNames, nextActivePlan } from "./lib/plans"
import {
  countdownParts,
  formatDisplayDate,
  isAnniversaryToday,
  nextAnniversary,
} from "./lib/dates"
import { ThemeToggle } from "@/components/theme-toggle"

function toFirestoreDate(value: { toDate?: () => Date } | Date | null | undefined) {
  if (!value) return null
  if (value instanceof Date) return value
  if (typeof value.toDate === "function") return value.toDate()
  return null
}

export default function Home() {
  const [nights, setNights] = useState<MovieNight[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const tick = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(tick)
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
          } as MovieNight
        })
      )
    })

    const plansUnsub = onSnapshot(collection(db, "planes"), (snapshot) => {
      setPlans(
        snapshot.docs.map((item) => {
          const data = item.data()
          return {
            id: item.id,
            ...data,
            date: toFirestoreDate(data.date) ?? undefined,
          } as Plan
        })
      )
    })

    return () => {
      nightsUnsub()
      plansUnsub()
    }
  }, [])

  const anniversary = useMemo(() => nextAnniversary(now), [now])
  const parts = useMemo(() => countdownParts(anniversary, now), [anniversary, now])
  const todayIsAnniversary = isAnniversaryToday(now)
  const nextNight = useMemo(() => nextScheduledNight(nights), [nights])
  const nextPlan = useMemo(() => nextActivePlan(plans), [plans])

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="px-4 pt-12 pb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-primary font-medium mb-1">
            Lazarski
          </p>
          <h1 className="text-3xl font-serif font-medium tracking-tight">Home</h1>
        </div>
        <ThemeToggle />
      </header>

      <main className="px-4 pb-28 space-y-6 max-w-4xl mx-auto">
        <section className="rounded-lg border border-border bg-card px-5 py-8 text-center">
          <p className="text-[11px] uppercase tracking-[0.22em] text-primary font-medium mb-2">
            Anniversary
          </p>
          {todayIsAnniversary ? (
            <>
              <h2 className="font-serif text-4xl leading-tight mb-2">It&apos;s today</h2>
              <p className="text-sm text-muted-foreground">July 10 — happy anniversary.</p>
            </>
          ) : (
            <>
              <h2 className="font-serif text-4xl leading-tight mb-6">July 10</h2>
              <div className="flex justify-center gap-8">
                <CountdownUnit value={parts.days} label="days" />
                <CountdownUnit value={parts.hours} label="hours" />
                <CountdownUnit value={parts.minutes} label="min" />
              </div>
            </>
          )}
        </section>

        <Link
          href="/movie-night"
          className="block rounded-lg border border-border bg-card overflow-hidden transition-colors hover:bg-card/80"
        >
          <div className="px-4 pt-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-primary font-medium">
              Next Movie Night
            </p>
          </div>
          {nextNight ? (
            <div className="p-4 flex items-center gap-4">
              <div className="h-20 w-14 shrink-0 overflow-hidden rounded-sm bg-muted">
                <img
                  src={nextNight.image || "/placeholder.svg?height=450&width=300"}
                  alt={nextNight.title}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <p className="font-serif text-lg leading-tight">{nextNight.title}</p>
                <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  {nextNight.date ? formatDisplayDate(nextNight.date) : "No date"}
                </p>
              </div>
            </div>
          ) : (
            <EmptyRow icon={Clapperboard} text="Nothing scheduled" />
          )}
        </Link>

        <Link
          href="/plans"
          className="block rounded-lg border border-border bg-card overflow-hidden transition-colors hover:bg-card/80"
        >
          <div className="px-4 pt-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-primary font-medium">
              Next plan
            </p>
          </div>
          {nextPlan ? (
            <div className="p-4">
              <p className="font-serif text-lg leading-tight flex items-center gap-2">
                <span>{categoryEmojis[nextPlan.category]}</span>
                <span>{nextPlan.title}</span>
              </p>
              <p className="text-sm text-muted-foreground mt-1.5 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                {nextPlan.date ? formatDisplayDate(nextPlan.date) : ""}
                <span>· {categoryNames[nextPlan.category]}</span>
              </p>
            </div>
          ) : (
            <EmptyRow icon={Calendar} text="Nothing scheduled" />
          )}
        </Link>
      </main>
    </div>
  )
}

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <p className="font-serif text-5xl tabular-nums leading-none">{value}</p>
      <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground mt-2">{label}</p>
    </div>
  )
}

function EmptyRow({ icon: Icon, text }: { icon: typeof Calendar; text: string }) {
  return (
    <div className="px-4 py-6 flex items-center gap-3 text-muted-foreground">
      <Icon className="h-4 w-4" />
      <p className="text-sm">{text}</p>
    </div>
  )
}
