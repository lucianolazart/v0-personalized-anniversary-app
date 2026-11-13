import { NextRequest, NextResponse } from "next/server"
import { collection, doc, getDoc, getDocs, setDoc, updateDoc } from "firebase/firestore"
import { db } from "@/app/lib/firebase"
import { categoryEmojis } from "@/app/lib/plans"
import { ANNIVERSARY_DAY, ANNIVERSARY_MONTH, plural, TOGETHER_SINCE_YEAR } from "@/app/lib/dates"
import {
  ensureVapid,
  loadSubscriptions,
  sendToSubscriptions,
  type PushFailure,
  type PushMessage,
} from "@/app/lib/push-server"
import { VapidConfigError } from "@/app/lib/vapid"
import type { Plan } from "@/app/types/plans"

// Called once a day by the Vercel cron in vercel.json (13:00 UTC = 10:00 in Argentina).
export const dynamic = "force-dynamic"

const ARGENTINA_TZ = "America/Argentina/Buenos_Aires"
const REMINDER_TTL_SECONDS = 60 * 60 * 12

function argentinaYmd(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ARGENTINA_TZ }).format(date)
}

function addDays(ymd: string, days: number) {
  const [year, month, day] = ymd.split("-").map(Number)
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10)
}

function firestoreYmd(value: unknown) {
  if (!value) return null
  const date =
    typeof (value as { toDate?: () => Date }).toDate === "function"
      ? (value as { toDate: () => Date }).toDate()
      : new Date(value as string | number | Date)
  if (Number.isNaN(date.getTime())) return null
  return argentinaYmd(date)
}

function isAuthorized(request: NextRequest) {
  // When CRON_SECRET is set, Vercel sends it as "Authorization: Bearer <secret>" on cron calls.
  const secret = process.env.CRON_SECRET
  if (!secret) return true
  return request.headers.get("authorization") === `Bearer ${secret}`
}

type RemindersSent = { eve?: string; day?: string }

type DueReminder = {
  message: PushMessage
  /** Records that this reminder went out, so a second run on the same day skips it. */
  markSent: () => Promise<void>
}

function dueReminders(params: {
  collectionName: "movieNights" | "planes"
  docId: string
  dateYmd: string
  remindersSent: RemindersSent
  today: string
  tomorrow: string
  eve: PushMessage
  day: PushMessage
}): DueReminder[] {
  const markSent = (kind: keyof RemindersSent) => async () => {
    await updateDoc(doc(db, params.collectionName, params.docId), {
      [`remindersSent.${kind}`]: params.dateYmd,
    })
  }
  const due: DueReminder[] = []
  if (params.dateYmd === params.tomorrow && params.remindersSent.eve !== params.dateYmd) {
    due.push({ message: params.eve, markSent: markSent("eve") })
  }
  if (params.dateYmd === params.today && params.remindersSent.day !== params.dateYmd) {
    due.push({ message: params.day, markSent: markSent("day") })
  }
  return due
}

const pad = (value: number) => String(value).padStart(2, "0")

// Anniversary reminders have no document of their own, so what was sent lives in recordatorios/aniversario.
const anniversaryRef = () => doc(db, "recordatorios", "aniversario")

async function anniversaryReminders(today: string, tomorrow: string): Promise<DueReminder[]> {
  const thisYear = Number(today.slice(0, 4))
  const ymdFor = (year: number) => `${year}-${pad(ANNIVERSARY_MONTH)}-${pad(ANNIVERSARY_DAY)}`
  const anniversaryYmd = ymdFor(thisYear) >= today ? ymdFor(thisYear) : ymdFor(thisYear + 1)
  const years = plural(Number(anniversaryYmd.slice(0, 4)) - TOGETHER_SINCE_YEAR, "año", "años")

  const kinds = {
    week: {
      due: addDays(today, 7) === anniversaryYmd,
      message: { title: "🧡 Falta una semana", body: `El 10 de julio cumplen ${years} juntos.` },
    },
    eve: {
      due: tomorrow === anniversaryYmd,
      message: { title: "🧡 Mañana es el aniversario", body: `Mañana cumplen ${years} juntos.` },
    },
    day: {
      due: today === anniversaryYmd,
      message: { title: "🧡 ¡Feliz aniversario!", body: `Hoy cumplen ${years} juntos.` },
    },
  }

  const pending = Object.entries(kinds).filter(([, kind]) => kind.due)
  if (pending.length === 0) return []

  let sent: Record<string, string> = {}
  try {
    sent = ((await getDoc(anniversaryRef())).data() ?? {}) as Record<string, string>
  } catch (error) {
    console.error("Could not read anniversary reminders:", error)
  }

  return pending
    .filter(([name]) => sent[name] !== anniversaryYmd)
    .map(([name, kind]) => ({
      message: { ...kind.message, url: "/", tag: `anniversary-${anniversaryYmd}-${name}` },
      markSent: async () => {
        try {
          await setDoc(anniversaryRef(), { [name]: anniversaryYmd }, { merge: true })
        } catch (error) {
          // If Firestore rules reject this collection the push still went out; a rerun the same day may repeat it.
          console.error("Could not record anniversary reminder:", error)
        }
      },
    }))
}

/** On Thursdays, if Friday to Sunday have nothing scheduled, ask what they'll do this weekend. */
async function weekendNudge(today: string, busyDays: Set<string>): Promise<DueReminder[]> {
  const [year, month, day] = today.split("-").map(Number)
  if (new Date(Date.UTC(year, month - 1, day)).getUTCDay() !== 4) return []
  const weekend = [addDays(today, 1), addDays(today, 2), addDays(today, 3)]
  if (weekend.some((ymd) => busyDays.has(ymd))) return []

  const ref = doc(db, "recordatorios", "finde")
  let lastSent: string | undefined
  try {
    lastSent = (await getDoc(ref)).data()?.ultimo
  } catch (error) {
    console.error("Could not read weekend nudge:", error)
  }
  if (lastSent === today) return []

  return [
    {
      message: {
        title: "🧡 ¿Qué hacen este finde?",
        body: "No tienen nada agendado. ¿Una peli o un plan?",
        url: "/calendario",
        tag: `finde-${today}`,
      },
      markSent: async () => {
        try {
          await setDoc(ref, { ultimo: today }, { merge: true })
        } catch (error) {
          console.error("Could not record weekend nudge:", error)
        }
      },
    },
  ]
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    ensureVapid()
  } catch (error) {
    if (error instanceof VapidConfigError) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    throw error
  }

  const today = argentinaYmd()
  const tomorrow = addDays(today, 1)

  const [nightsSnap, plansSnap, subscriptions] = await Promise.all([
    getDocs(collection(db, "movieNights")),
    getDocs(collection(db, "planes")),
    loadSubscriptions(),
  ])

  const due: DueReminder[] = []
  // Days that already have a scheduled movie night or a pending plan (for the weekend nudge).
  const busyDays = new Set<string>()

  for (const item of nightsSnap.docs) {
    const data = item.data()
    if (data.status !== "scheduled") continue
    const dateYmd = firestoreYmd(data.date)
    if (!dateYmd) continue
    busyDays.add(dateYmd)

    due.push(
      ...dueReminders({
        collectionName: "movieNights",
        docId: item.id,
        dateYmd,
        remindersSent: (data.remindersSent ?? {}) as RemindersSent,
        today,
        tomorrow,
        eve: {
          title: "🍿 Mañana hay noche de peli",
          body: `Mañana toca ver ${data.title}`,
          url: "/movie-night",
          tag: `movie-night-${item.id}-eve`,
        },
        day: {
          title: "🍿 Hoy hay noche de peli",
          body: `Esta noche toca ver ${data.title}`,
          url: "/movie-night",
          tag: `movie-night-${item.id}-day`,
        },
      })
    )
  }

  for (const item of plansSnap.docs) {
    const data = item.data()
    if (data.completed) continue
    const dateYmd = firestoreYmd(data.date)
    if (!dateYmd) continue
    busyDays.add(dateYmd)

    const emoji = categoryEmojis[data.category as Plan["category"]] ?? "📅"
    const where = typeof data.location === "string" && data.location.trim() ? ` 📍 ${data.location.trim()}` : ""
    due.push(
      ...dueReminders({
        collectionName: "planes",
        docId: item.id,
        dateYmd,
        remindersSent: (data.remindersSent ?? {}) as RemindersSent,
        today,
        tomorrow,
        eve: {
          title: `${emoji} Mañana: ${data.title}`,
          body: `Mañana tienen este plan.${where}`,
          url: "/plans",
          tag: `plan-${item.id}-eve`,
        },
        day: {
          title: `${emoji} Hoy: ${data.title}`,
          body: `Hoy tienen este plan.${where}`,
          url: "/plans",
          tag: `plan-${item.id}-day`,
        },
      })
    )
  }

  due.push(...(await anniversaryReminders(today, tomorrow)))
  due.push(...(await weekendNudge(today, busyDays)))

  const summary = {
    today,
    due: due.length,
    subscribers: subscriptions.length,
    sent: 0,
    delivered: 0,
    failures: [] as PushFailure[],
  }

  // Without subscribers nothing is marked as sent, so the reminder still goes out once
  // someone subscribes (if it is still the same day).
  if (due.length === 0 || subscriptions.length === 0) {
    return NextResponse.json(summary)
  }

  for (const reminder of due) {
    if (subscriptions.length === 0) break
    const result = await sendToSubscriptions(subscriptions, reminder.message, {
      ttlSeconds: REMINDER_TTL_SECONDS,
    })
    summary.sent += result.sent
    summary.failures.push(...result.failures)

    // Only mark the reminder as sent once at least one device accepted it.
    if (result.sent > 0) {
      summary.delivered += 1
      await reminder.markSent()
    }
  }

  return NextResponse.json(summary)
}
