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

const ARGENTINA_TZ = "America/Argentina/Buenos_Aires"

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

function argentinaYmd(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ARGENTINA_TZ }).format(date)
}

function addDays(ymd: string, days: number) {
  const [year, month, day] = ymd.split("-").map(Number)
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10)
}

function nightYmd(value: { toDate?: () => Date } | Date | null | undefined) {
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

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const today = argentinaYmd()
  const tomorrow = addDays(today, 1)

  const [nightsSnap, subsSnap] = await Promise.all([
    getDocs(collection(db, "movieNights")),
    getDocs(collection(db, "pushSubscriptions")),
  ])

  const nights = nightsSnap.docs
    .map((item) => {
      const data = item.data()
      return {
        id: item.id,
        title: data.title as string,
        status: data.status as string,
        dateYmd: nightYmd(data.date),
        remindersSent: (data.remindersSent ?? {}) as { eve?: string; day?: string },
      }
    })
    .filter((night) => night.status === "scheduled" && night.dateYmd)

  const messages: { title: string; body: string }[] = []

  for (const night of nights) {
    const updates: { remindersSent: { eve?: string; day?: string } } = {
      remindersSent: { ...night.remindersSent },
    }
    let changed = false

    if (night.dateYmd === tomorrow && night.remindersSent.eve !== night.dateYmd) {
      messages.push({
        title: "🍿 Movie Night tomorrow",
        body: `Tomorrow you watch ${night.title}`,
      })
      updates.remindersSent.eve = night.dateYmd
      changed = true
    }

    if (night.dateYmd === today && night.remindersSent.day !== night.dateYmd) {
      messages.push({
        title: "🍿 Movie Night today",
        body: `Tonight you watch ${night.title}`,
      })
      updates.remindersSent.day = night.dateYmd
      changed = true
    }

    if (changed) {
      await updateDoc(doc(db, "movieNights", night.id), updates)
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
            url: "/movie-night",
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
