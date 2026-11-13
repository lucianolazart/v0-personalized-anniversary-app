import { NextRequest, NextResponse } from "next/server"
import { ensureVapid, loadSubscriptions, sendToSubscriptions } from "@/app/lib/push-server"
import { VapidConfigError } from "@/app/lib/vapid"

export const dynamic = "force-dynamic"

// The app has no user accounts, so the endpoint itself is the only credential, and it is readable
// by anyone who can list `pushSubscriptions`. Throttle tests per device so a leaked endpoint can't
// be used to flood a phone. In-memory, so the limit is per server instance (best effort).
const TEST_COOLDOWN_MS = 15_000
const lastTestByEndpoint = new Map<string, number>()

function isPushEndpoint(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 2048) return false
  try {
    return new URL(value).protocol === "https:"
  } catch {
    return false
  }
}

// Sends a test notification to exactly one device: the one whose push endpoint is in the
// body (the phone that pressed "Send test"). The endpoint is an unguessable URL that only
// that device knows, so callers can only reach their own device. There is deliberately no
// "send to everyone" mode, and the response never reveals how many devices are subscribed.
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as { endpoint?: unknown }
  if (!isPushEndpoint(body.endpoint)) {
    return NextResponse.json({ error: "Falta el endpoint de notificaciones o no es válido.", sent: 0 }, { status: 400 })
  }
  const endpoint = body.endpoint

  const lastTest = lastTestByEndpoint.get(endpoint)
  if (lastTest !== undefined && Date.now() - lastTest < TEST_COOLDOWN_MS) {
    return NextResponse.json(
      { error: "Esperá unos segundos antes de mandar otra prueba.", sent: 0 },
      { status: 429 }
    )
  }

  try {
    ensureVapid()
  } catch (error) {
    if (error instanceof VapidConfigError) {
      return NextResponse.json({ error: error.message, sent: 0 }, { status: 500 })
    }
    throw error
  }

  const targets = (await loadSubscriptions()).filter((item) => item.endpoint === endpoint)
  if (targets.length === 0) {
    return NextResponse.json(
      { error: "La suscripción de este dispositivo todavía no está guardada en el servidor. Tocá Reintentar.", sent: 0 },
      { status: 400 }
    )
  }

  // Only endpoints that are really subscribed get recorded, so the map stays as small as the collection.
  lastTestByEndpoint.set(endpoint, Date.now())

  const { sent, failures } = await sendToSubscriptions(
    targets,
    { title: "Lazarski", body: "Notificación de prueba: los avisos funcionan.", url: "/", tag: "test-push" },
    { ttlSeconds: 60 * 60 }
  )

  if (sent === 0) {
    const first = failures[0]
    return NextResponse.json(
      {
        error: first
          ? `${first.service} rechazó la notificación${first.statusCode ? ` (${first.statusCode})` : ""}: ${first.message}`
          : "No se pudo enviar la prueba",
        sent: 0,
      },
      { status: 502 }
    )
  }

  return NextResponse.json({ sent })
}
