import {
  addDoc,
  collection,
  getDocs,
} from "firebase/firestore"
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

export async function enableMovieNightPush() {
  if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
    throw new Error("Este navegador no soporta avisos")
  }

  const permission = await Notification.requestPermission()
  if (permission !== "granted") {
    throw new Error("denied")
  }

  const registration = await navigator.serviceWorker.register("/service-worker.js")
  await navigator.serviceWorker.ready

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  })

  const payload = subscription.toJSON()
  if (!payload.endpoint || !payload.keys?.p256dh || !payload.keys?.auth) {
    throw new Error("No se pudo crear la suscripción")
  }

  const existing = await getDocs(collection(db, "pushSubscriptions"))
  const alreadySaved = existing.docs.some((item) => item.data().endpoint === payload.endpoint)
  if (!alreadySaved) {
    await addDoc(collection(db, "pushSubscriptions"), {
      endpoint: payload.endpoint,
      keys: {
        p256dh: payload.keys.p256dh,
        auth: payload.keys.auth,
      },
      createdAt: new Date(),
    })
  }

  return subscription
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
