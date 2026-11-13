"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { collection, onSnapshot } from "firebase/firestore"
import { ChevronRight, ListTodo } from "lucide-react"
import { db } from "./lib/firebase"
import type { MovieNight } from "./types/movie-night"
import type { Plan } from "./types/plans"
import { nextScheduledNight } from "./lib/movie-night"
import { categoryNames, nextActivePlan, planFromDoc } from "./lib/plans"
import {
  anniversaryProgress,
  countdownParts,
  daysTogether,
  isAnniversaryToday,
  nextAnniversary,
  plural,
  relativeDay,
  shortDateParts,
  timeTogether,
  toFirestoreDate,
  TOGETHER_SINCE_YEAR,
} from "./lib/dates"
import { CategoryIcon } from "./components/CategoryIcon"
import { RemindersButton } from "./components/RemindersButton"
import { ThemeToggle } from "@/components/theme-toggle"
import { PageHeader, SectionLabel } from "@/components/page-header"
import { DateColumn } from "@/components/date-column"
import { cn } from "@/lib/utils"

export default function Home() {
  const [nights, setNights] = useState<MovieNight[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  // The page is prerendered at build time, so everything that depends on "today" waits for the
  // browser; otherwise the HTML would show the build date's numbers and React would not fix them.
  const [clientNow, setClientNow] = useState<Date | null>(null)

  useEffect(() => {
    setClientNow(new Date())
    const tick = window.setInterval(() => setClientNow(new Date()), 60_000)
    return () => window.clearInterval(tick)
  }, [])
  const now = useMemo(() => clientNow ?? new Date(0), [clientNow])

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
      setPlans(snapshot.docs.map((item) => planFromDoc(item.id, item.data())))
    })

    return () => {
      nightsUnsub()
      plansUnsub()
    }
  }, [])

  const anniversary = useMemo(() => nextAnniversary(now), [now])
  const parts = useMemo(() => countdownParts(anniversary, now), [anniversary, now])
  const todayIsAnniversary = isAnniversaryToday(now)
  const together = useMemo(() => timeTogether(now), [now])
  const totalDays = useMemo(() => daysTogether(now), [now])
  const progress = useMemo(() => anniversaryProgress(now), [now])
  const nextNight = useMemo(() => nextScheduledNight(nights), [nights])
  const nextPlan = useMemo(() => nextActivePlan(plans), [plans])
  const ideasCount = useMemo(() => plans.filter((plan) => !plan.completed && !plan.date).length, [plans])

  const year = now.getFullYear()
  const stats = useMemo(() => {
    const inYear = (date?: Date | null) => Boolean(date && date.getFullYear() === year)
    return {
      movies: nights.filter((night) => night.status === "watched" && inYear(night.date)).length,
      // Plans done before completedAt existed fall back to their planned date.
      plans: plans.filter((plan) => plan.completed && inYear(plan.completedAt ?? plan.date)).length,
    }
  }, [nights, plans, year])

  const today = shortDateParts(now)
  const mono = (date: Date) => {
    const p = shortDateParts(date)
    return `${p.day} ${p.month} ${date.getFullYear()}`
  }

  if (!clientNow) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <PageHeader title="Lazarski" />
        <main className="px-5 pb-28 max-w-xl mx-auto" aria-busy>
          <div className="mt-4 h-[188px] rounded-2xl bg-accent animate-pulse" />
          <div className="mt-5 h-[88px] border-y border-border" />
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageHeader
        eyebrow={`${today.weekday} ${today.day} ${today.month} ${year}`}
        title="Lazarski"
        actions={
          <>
            <RemindersButton />
            <ThemeToggle />
          </>
        }
      />

      <main className="px-5 pb-28 max-w-xl mx-auto">
        <section className="mt-4 rounded-2xl bg-accent px-5 pt-5 pb-6">
          <p className="label-mono text-accent-foreground">Juntos</p>
          <p className="mt-2 flex items-baseline gap-2">
            <span className="text-[76px] leading-[0.9] font-semibold tracking-[-0.05em] tabular-nums">
              {totalDays.toLocaleString("es-AR")}
            </span>
            <span className="text-xl font-medium text-muted-foreground">días</span>
          </p>
          <p className="mt-3 text-[15px] text-foreground/80">
            {plural(together.years, "año", "años")}
            {together.days > 0 && ` y ${plural(together.days, "día", "días")}`} · desde el 10 de julio de{" "}
            {TOGETHER_SINCE_YEAR}
          </p>
          {todayIsAnniversary && (
            <p className="mt-4 inline-flex rounded-full bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground">
              ¡Feliz aniversario! Hoy cumplen {plural(together.years, "año", "años")}
            </p>
          )}
        </section>

        <section className="mt-5 grid grid-cols-3 border-y border-border">
          <Kpi value={todayIsAnniversary ? "¡Hoy!" : parts.days} label="días al aniversario" />
          <Kpi value={stats.movies} label={`${stats.movies === 1 ? "peli" : "pelis"} juntos en ${year}`} divided />
          <Kpi value={stats.plans} label={`${stats.plans === 1 ? "plan hecho" : "planes hechos"} en ${year}`} divided />
        </section>

        <section className="mt-6" aria-label="Camino al próximo aniversario">
          <div className="relative h-0.5 rounded-full bg-border">
            <div className="absolute inset-y-0 left-0 rounded-full bg-primary" style={{ width: `${progress.fraction * 100}%` }} />
            <span
              className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-primary"
              style={{ left: `${progress.fraction * 100}%` }}
            />
          </div>
          <div className="mt-2.5 flex justify-between font-mono text-[11px] text-muted-foreground">
            <span>{mono(progress.last)}</span>
            <span>
              {progress.number}º aniversario · {mono(progress.next)}
            </span>
          </div>
        </section>

        <section className="mt-8">
          <SectionLabel>Próximo</SectionLabel>

          <Link href="/movie-night" className="flex items-center gap-3.5 py-3 border-b border-border">
            <DateColumn date={nextNight?.date} highlight />
            {nextNight ? (
              <img
                src={nextNight.image || "/placeholder.svg?height=450&width=300"}
                alt=""
                className="h-12 w-8 shrink-0 rounded object-cover"
              />
            ) : (
              <span className="h-12 w-8 shrink-0 rounded bg-muted" aria-hidden />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-base font-semibold truncate">{nextNight ? nextNight.title : "Ninguna noche de peli"}</p>
              <p className="text-[13px] text-muted-foreground">
                {nextNight?.date ? `Noche de peli · ${relativeDay(nextNight.date, now)}` : "Agendá la próxima"}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground/70" />
          </Link>

          <Link href="/plans" className="flex items-center gap-3.5 py-3 border-b border-border">
            <DateColumn date={nextPlan?.date} highlight />
            {nextPlan ? (
              <CategoryIcon category={nextPlan.category} />
            ) : (
              <span className="h-9 w-9 shrink-0 inline-flex items-center justify-center rounded-lg border border-border bg-card">
                <ListTodo className="h-[18px] w-[18px]" strokeWidth={1.75} />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-base font-semibold truncate">{nextPlan ? nextPlan.title : "Ningún plan agendado"}</p>
              <p className="text-[13px] text-muted-foreground">
                {nextPlan?.date
                  ? `${categoryNames[nextPlan.category]} · ${relativeDay(nextPlan.date, now)}`
                  : `${plural(ideasCount, "idea", "ideas")} sin fecha`}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground/70" />
          </Link>
        </section>
      </main>
    </div>
  )
}

function Kpi({ value, label, divided = false }: { value: number | string; label: string; divided?: boolean }) {
  return (
    <div className={cn("py-4", divided ? "border-l border-border pl-3" : "pr-3")}>
      <p className="text-[28px] font-semibold tracking-[-0.03em] tabular-nums leading-none">{value}</p>
      <p className="mt-1.5 text-xs leading-snug text-muted-foreground">{label}</p>
    </div>
  )
}
