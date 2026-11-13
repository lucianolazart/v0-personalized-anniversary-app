import { doc, setDoc } from "firebase/firestore"
import { db } from "./firebase"
import { VAPID_PUBLIC_KEY } from "./vapid-public"

export type PushErrorCode =
  | "unsupported"
  | "denied"
  | "vapid-missing"
  | "sw-not-active"
  | "subscription"
  | "save-failed"
  | "test-failed"

export class PushSetupError extends Error {
  code: PushErrorCode
  constructor(code: PushErrorCode, detail?: string) {
    super(detail || code)
    this.name = "PushSetupError"
    this.code = code
  }
}

const SERVICE_WORKER_TIMEOUT_MS = 15000

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"))
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i)
  }
  return output
}

function sameKey(a: ArrayBuffer | null | undefined, b: Uint8Array) {
  if (!a) return true // Browser does not expose it; assume it matches.
  const bytes = new Uint8Array(a)
  if (bytes.length !== b.length) return false
  return bytes.every((value, index) => value === b[index])
}

async function subscriptionDocId(endpoint: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(endpoint))
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
}

async function activeRegistration() {
  await navigator.serviceWorker.register("/service-worker.js", { scope: "/" })
  // `ready` never settles if the worker fails to install, so don't wait forever.
  const registration = await Promise.race([
    navigator.serviceWorker.ready,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), SERVICE_WORKER_TIMEOUT_MS)),
  ])
  if (!registration?.active) {
    throw new PushSetupError("sw-not-active")
  }
  return registration
}

export async function enableMovieNightPush() {
  if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
    throw new PushSetupError("unsupported")
  }
  if (!VAPID_PUBLIC_KEY) {
    throw new PushSetupError("vapid-missing")
  }

  const permission = await Notification.requestPermission()
  if (permission !== "granted") {
    throw new PushSetupError("denied")
  }

  const registration = await activeRegistration()
  const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY)

  let subscription = await registration.pushManager.getSubscription()
  if (subscription && !sameKey(subscription.options?.applicationServerKey, applicationServerKey)) {
    // Created with an older VAPID key: the server can no longer sign pushes for it.
    await subscription.unsubscribe().catch(() => undefined)
    subscription = null
  }
  if (!subscription) {
    try {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      })
    } catch (error) {
      throw new PushSetupError("subscription", error instanceof Error ? error.message : undefined)
    }
  }

  const payload = subscription.toJSON()
  if (!payload.endpoint || !payload.keys?.p256dh || !payload.keys?.auth) {
    throw new PushSetupError("subscription")
  }

  try {
    const id = await subscriptionDocId(payload.endpoint)
    await setDoc(
      doc(db, "pushSubscriptions", id),
      {
        endpoint: payload.endpoint,
        keys: {
          p256dh: payload.keys.p256dh,
          auth: payload.keys.auth,
        },
        userAgent: navigator.userAgent,
        updatedAt: new Date(),
      },
      { merge: true }
    )
  } catch (error) {
    throw new PushSetupError("save-failed", error instanceof Error ? error.message : undefined)
  }

  return subscription
}

export async function sendTestPush() {
  const subscription = await enableMovieNightPush()
  const response = await fetch("/api/movie-night/test-push", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint: subscription.endpoint }),
  })
  const data = (await response.json().catch(() => ({}))) as { error?: string; sent?: number }
  if (!response.ok) {
    throw new PushSetupError("test-failed", data.error || `HTTP ${response.status}`)
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

export function pushErrorMessage(error: unknown) {
  const code = error instanceof PushSetupError ? error.code : undefined
  switch (code) {
    case "unsupported":
      return "This browser can't receive push. On iPhone, add the app to the Home Screen and open it from there."
    case "denied":
      return "Notifications are blocked. Enable them in the browser or phone settings."
    case "vapid-missing":
      return "Push is not configured: NEXT_PUBLIC_VAPID_PUBLIC_KEY is missing in this build."
    case "sw-not-active":
      return "The app's service worker did not start. Close the app completely and open it again."
    case "subscription":
      return `The phone refused the push subscription${error instanceof Error && error.message !== code ? `: ${error.message}` : "."}`
    case "save-failed":
      return "Could not save this device's subscription in the database."
    case "test-failed":
      return `Test failed: ${(error as Error).message}`
    default:
      return "Could not enable alerts. On iPhone, add the app to the Home Screen first."
  }
}
