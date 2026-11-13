import { NextRequest, NextResponse } from "next/server"
import { ensureVapid, loadSubscriptions, sendToSubscriptions } from "@/app/lib/push-server"
import { VapidConfigError } from "@/app/lib/vapid"

export const dynamic = "force-dynamic"

// Sends a test notification. With { endpoint } in the body it only targets that device
// (the phone that pressed "Send test"); without it, every saved subscription.
export async function POST(request: NextRequest) {
  try {
    ensureVapid()
  } catch (error) {
    if (error instanceof VapidConfigError) {
      return NextResponse.json({ error: error.message, sent: 0 }, { status: 500 })
    }
    throw error
  }

  const body = (await request.json().catch(() => ({}))) as { endpoint?: string }
  const all = await loadSubscriptions()
  const targets = body.endpoint ? all.filter((item) => item.endpoint === body.endpoint) : all

  if (targets.length === 0) {
    return NextResponse.json(
      {
        error: body.endpoint
          ? "This device's subscription is not saved on the server yet. Tap Retry."
          : "No push subscriptions saved yet. Enable reminders first.",
        sent: 0,
        subscribers: all.length,
      },
      { status: 400 }
    )
  }

  const { sent, failures } = await sendToSubscriptions(
    targets,
    { title: "Lazarski", body: "Test notification — push is working.", url: "/", tag: "test-push" },
    { ttlSeconds: 60 * 60 }
  )

  if (sent === 0) {
    const first = failures[0]
    return NextResponse.json(
      {
        error: first
          ? `${first.service} rejected the push${first.statusCode ? ` (${first.statusCode})` : ""}: ${first.message}`
          : "Could not send test push",
        sent: 0,
        subscribers: all.length,
        failures,
      },
      { status: 502 }
    )
  }

  return NextResponse.json({ sent, subscribers: all.length, failures })
}
