import { NextResponse } from "next/server"
import webpush from "web-push"
import { collection, deleteDoc, doc, getDocs } from "firebase/firestore"
import { db } from "@/app/lib/firebase"
import { VAPID_PRIVATE_KEY, VAPID_PUBLIC_KEY, VAPID_SUBJECT } from "@/app/lib/vapid"

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)

export async function POST() {
  const subsSnap = await getDocs(collection(db, "pushSubscriptions"))
  if (subsSnap.empty) {
    return NextResponse.json(
      { error: "No push subscriptions saved yet. Enable reminders first.", sent: 0 },
      { status: 400 }
    )
  }

  const payload = JSON.stringify({
    title: "Lazarski",
    body: "Test notification — push is working.",
    url: "/",
  })

  let sent = 0
  const errors: string[] = []

  for (const subDoc of subsSnap.docs) {
    const data = subDoc.data()
    const subscription = {
      endpoint: data.endpoint as string,
      keys: {
        p256dh: data.keys?.p256dh as string,
        auth: data.keys?.auth as string,
      },
    }

    try {
      await webpush.sendNotification(subscription, payload)
      sent += 1
    } catch (error) {
      const statusCode = (error as { statusCode?: number }).statusCode
      const message = error instanceof Error ? error.message : "send failed"
      errors.push(message)
      if (statusCode === 404 || statusCode === 410) {
        await deleteDoc(doc(db, "pushSubscriptions", subDoc.id))
      }
    }
  }

  if (sent === 0) {
    return NextResponse.json(
      { error: errors[0] || "Could not send test push", sent: 0, subscribers: subsSnap.size },
      { status: 500 }
    )
  }

  return NextResponse.json({ sent, subscribers: subsSnap.size })
}
