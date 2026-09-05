import { doc, setDoc } from "firebase/firestore"
import { db } from "./firebase"
import { VAPID_PUBLIC_KEY } from "./vapid-public"

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"))
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i)
  }
  return output
}

async function subscriptionDocId(endpoint: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(endpoint))
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
}

export async function enableMovieNightPush() {
  if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
    throw new Error("unsupported")
  }

  const permission = await Notification.requestPermission()
  if (permission !== "granted") {
    throw new Error("denied")
  }

  const registration = await navigator.serviceWorker.register("/service-worker.js", { scope: "/" })
  await navigator.serviceWorker.ready

  let subscription = await registration.pushManager.getSubscription()
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })
  }

  const payload = subscription.toJSON()
  if (!payload.endpoint || !payload.keys?.p256dh || !payload.keys?.auth) {
    throw new Error("subscription")
  }

  const id = await subscriptionDocId(payload.endpoint)
  await setDoc(
    doc(db, "pushSubscriptions", id),
    {
      endpoint: payload.endpoint,
      keys: {
        p256dh: payload.keys.p256dh,
        auth: payload.keys.auth,
      },
      updatedAt: new Date(),
    },
    { merge: true }
  )

  return subscription
}

export async function sendTestPush() {
  await enableMovieNightPush()
  const response = await fetch("/api/movie-night/test-push", { method: "POST" })
  const data = (await response.json().catch(() => ({}))) as { error?: string; sent?: number }
  if (!response.ok) {
    throw new Error(data.error || "test-failed")
  }
  return data
}

export function notificationSupport() {
  if (typeof window === "undefined") return "unsupported" as const
  if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
    return "unsupported" as const
  }
  if (Notification.permission === "granted") return "granted" as const
  if (Notification.permission === "denied") return "denied" as const
  return "default" as const
}
