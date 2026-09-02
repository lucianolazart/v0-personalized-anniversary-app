import { NextRequest, NextResponse } from "next/server"
import webpush from "web-push"
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  updateDoc,
} from "firebase/firestore"
import { db } from "@/app/lib/firebase"
import { VAPID_PRIVATE_KEY, VAPID_PUBLIC_KEY, VAPID_SUBJECT } from "@/app/lib/vapid"
import { categoryEmojis } from "@/app/lib/plans"
import type { Plan } from "@/app/types/plans"

const ARGENTINA_TZ = "America/Argentina/Buenos_Aires"

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

function argentinaYmd(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ARGENTINA_TZ }).format(date)
}

function addDays(ymd: string, days: number) {
  const [year, month, day] = ymd.split("-").map(Number)
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10)
}

function firestoreYmd(value: { toDate?: () => Date } | Date | null | undefined) {
  if (!value) return null
  const date = typeof (value as { toDate?: () => Date }).toDate === "function"
    ? (value as { toDate: () => Date }).toDate()
    : (value as Date)
  return argentinaYmd(date)
}

function isAuthorized(request: NextRequest) {
  if (request.headers.get("x-vercel-cron") === "1") return true
  const secret = process.env.CRON_SECRET
  if (!secret) return true
  return request.headers.get("authorization") === `Bearer ${secret}`
}

type PushMessage = { title: string; body: string; url: string }
type RemindersSent = { eve?: string; day?: string }

function collectDueReminders(params: {
  dateYmd: string | null
  remindersSent: RemindersSent
  today: string
  tomorrow: string
  eve: { title: string; body: string; url: string }
  day: { title: string; body: string; url: string }
}) {
  const messages: PushMessage[] = []
  const updates: RemindersSent = { ...params.remindersSent }
  let changed = false

  if (params.dateYmd === params.tomorrow && params.remindersSent.eve !== params.dateYmd) {
    messages.push(params.eve)
    updates.eve = params.dateYmd
    changed = true
  }

  if (params.dateYmd === params.today && params.remindersSent.day !== params.dateYmd) {
    messages.push(params.day)
    updates.day = params.dateYmd
    changed = true
  }

  return { messages, updates, changed }
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const today = argentinaYmd()
  const tomorrow = addDays(today, 1)

  const [nightsSnap, plansSnap, subsSnap] = await Promise.all([
    getDocs(collection(db, "movieNights")),
    getDocs(collection(db, "planes")),
    getDocs(collection(db, "pushSubscriptions")),
  ])

  const messages: PushMessage[] = []

  for (const item of nightsSnap.docs) {
    const data = item.data()
    if (data.status !== "scheduled") continue
    const dateYmd = firestoreYmd(data.date)
    if (!dateYmd) continue

    const remindersSent = (data.remindersSent ?? {}) as RemindersSent
    const result = collectDueReminders({
      dateYmd,
      remindersSent,
      today,
      tomorrow,
      eve: {
        title: "🍿 Movie Night tomorrow",
        body: `Tomorrow you watch ${data.title}`,
        url: "/movie-night",
      },
      day: {
        title: "🍿 Movie Night today",
        body: `Tonight you watch ${data.title}`,
        url: "/movie-night",
      },
    })

    messages.push(...result.messages)
    if (result.changed) {
      await updateDoc(doc(db, "movieNights", item.id), { remindersSent: result.updates })
    }
  }

  for (const item of plansSnap.docs) {
    const data = item.data()
    if (data.completed) continue
    const dateYmd = firestoreYmd(data.date)
    if (!dateYmd) continue

    const category = data.category as Plan["category"]
    const emoji = categoryEmojis[category] ?? "📅"
    const remindersSent = (data.remindersSent ?? {}) as RemindersSent
    const result = collectDueReminders({
      dateYmd,
      remindersSent,
      today,
      tomorrow,
      eve: {
        title: `${emoji} Tomorrow: ${data.title}`,
        body: `Tomorrow: ${data.title}`,
        url: "/plans",
      },
      day: {
        title: `${emoji} Today: ${data.title}`,
        body: `Today: ${data.title}`,
        url: "/plans",
      },
    })

    messages.push(...result.messages)
    if (result.changed) {
      await updateDoc(doc(db, "planes", item.id), { remindersSent: result.updates })
    }
  }

  if (messages.length === 0 || subsSnap.empty) {
    return NextResponse.json({ sent: 0, messages: messages.length, subscribers: subsSnap.size })
  }

  let sent = 0
  for (const subDoc of subsSnap.docs) {
    const data = subDoc.data()
    const subscription = {
      endpoint: data.endpoint as string,
      keys: {
        p256dh: data.keys?.p256dh as string,
        auth: data.keys?.auth as string,
      },
    }

    for (const message of messages) {
      try {
        await webpush.sendNotification(
          subscription,
          JSON.stringify({
            title: message.title,
            body: message.body,
            url: message.url,
          })
        )
        sent += 1
      } catch (error) {
        const statusCode = (error as { statusCode?: number }).statusCode
        if (statusCode === 404 || statusCode === 410) {
          await deleteDoc(doc(db, "pushSubscriptions", subDoc.id))
          break
        }
      }
    }
  }

  return NextResponse.json({ sent, messages: messages.length, subscribers: subsSnap.size })
}
