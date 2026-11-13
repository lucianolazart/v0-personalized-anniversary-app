import { NextRequest, NextResponse } from "next/server"
import { collection, doc, getDocs, updateDoc } from "firebase/firestore"
import { db } from "@/app/lib/firebase"
import { categoryEmojis } from "@/app/lib/plans"
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
  collectionName: "movieNights" | "planes"
  docId: string
  kind: keyof RemindersSent
  dateYmd: string
  message: PushMessage
}

function dueReminders(params: {
  collectionName: DueReminder["collectionName"]
  docId: string
  dateYmd: string
  remindersSent: RemindersSent
  today: string
  tomorrow: string
  eve: PushMessage
  day: PushMessage
}): DueReminder[] {
  const base = { collectionName: params.collectionName, docId: params.docId, dateYmd: params.dateYmd }
  const due: DueReminder[] = []
  if (params.dateYmd === params.tomorrow && params.remindersSent.eve !== params.dateYmd) {
    due.push({ ...base, kind: "eve", message: params.eve })
  }
  if (params.dateYmd === params.today && params.remindersSent.day !== params.dateYmd) {
    due.push({ ...base, kind: "day", message: params.day })
  }
  return due
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

  for (const item of nightsSnap.docs) {
    const data = item.data()
    if (data.status !== "scheduled") continue
    const dateYmd = firestoreYmd(data.date)
    if (!dateYmd) continue

    due.push(
      ...dueReminders({
        collectionName: "movieNights",
        docId: item.id,
        dateYmd,
        remindersSent: (data.remindersSent ?? {}) as RemindersSent,
        today,
        tomorrow,
        eve: {
          title: "🍿 Movie Night tomorrow",
          body: `Tomorrow you watch ${data.title}`,
          url: "/movie-night",
          tag: `movie-night-${item.id}-eve`,
        },
        day: {
          title: "🍿 Movie Night today",
          body: `Tonight you watch ${data.title}`,
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

    const emoji = categoryEmojis[data.category as Plan["category"]] ?? "📅"
    due.push(
      ...dueReminders({
        collectionName: "planes",
        docId: item.id,
        dateYmd,
        remindersSent: (data.remindersSent ?? {}) as RemindersSent,
        today,
        tomorrow,
        eve: {
          title: `${emoji} Tomorrow: ${data.title}`,
          body: `Tomorrow: ${data.title}`,
          url: "/plans",
          tag: `plan-${item.id}-eve`,
        },
        day: {
          title: `${emoji} Today: ${data.title}`,
          body: `Today: ${data.title}`,
          url: "/plans",
          tag: `plan-${item.id}-day`,
        },
      })
    )
  }

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
      await updateDoc(doc(db, reminder.collectionName, reminder.docId), {
        [`remindersSent.${reminder.kind}`]: reminder.dateYmd,
      })
    }
  }

  return NextResponse.json(summary)
}
