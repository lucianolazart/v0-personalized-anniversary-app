// Server-side Web Push helpers shared by the reminders cron and the test endpoint.
import webpush from "web-push"
import { collection, deleteDoc, doc, getDocs } from "firebase/firestore"
import { db } from "./firebase"
import { getVapidConfig } from "./vapid"

export type PushMessage = { title: string; body: string; url: string; tag?: string }

export type StoredSubscription = {
  id: string
  endpoint: string
  keys: { p256dh: string; auth: string }
}

export type PushFailure = { service: string; statusCode?: number; message: string }

let vapidReady = false

/** Throws VapidConfigError when the env vars are missing. */
export function ensureVapid() {
  if (vapidReady) return
  const { subject, publicKey, privateKey } = getVapidConfig()
  webpush.setVapidDetails(subject, publicKey, privateKey)
  vapidReady = true
}

export async function loadSubscriptions(): Promise<StoredSubscription[]> {
  const snap = await getDocs(collection(db, "pushSubscriptions"))
  return snap.docs.flatMap((item) => {
    const data = item.data()
    const endpoint = data.endpoint as string | undefined
    const p256dh = data.keys?.p256dh as string | undefined
    const auth = data.keys?.auth as string | undefined
    if (!endpoint || !p256dh || !auth) return []
    return [{ id: item.id, endpoint, keys: { p256dh, auth } }]
  })
}

function pushService(endpoint: string) {
  try {
    return new URL(endpoint).host
  } catch {
    return "unknown"
  }
}

/**
 * Sends one message to every subscription. Subscriptions the push service reports as gone
 * (404/410) are deleted from Firestore and removed from the `subscriptions` array in place,
 * so later messages in the same run skip them.
 */
export async function sendToSubscriptions(
  subscriptions: StoredSubscription[],
  message: PushMessage,
  options: { ttlSeconds: number }
) {
  ensureVapid()

  let sent = 0
  const failures: PushFailure[] = []
  const payload = JSON.stringify(message)

  for (const subscription of [...subscriptions]) {
    try {
      await webpush.sendNotification(
        { endpoint: subscription.endpoint, keys: subscription.keys },
        payload,
        { TTL: options.ttlSeconds, urgency: "high" }
      )
      sent += 1
    } catch (error) {
      const statusCode = (error as { statusCode?: number }).statusCode
      const body = (error as { body?: string }).body
      const message = [error instanceof Error ? error.message : "send failed", body]
        .filter(Boolean)
        .join(" — ")
      failures.push({ service: pushService(subscription.endpoint), statusCode, message })

      if (statusCode === 404 || statusCode === 410) {
        await deleteDoc(doc(db, "pushSubscriptions", subscription.id))
        const index = subscriptions.indexOf(subscription)
        if (index !== -1) subscriptions.splice(index, 1)
      }
    }
  }

  return { sent, failures }
}
