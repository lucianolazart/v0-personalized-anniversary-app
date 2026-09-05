"use client"

import { useEffect, useState } from "react"
import { Bell, BellOff, BellRing } from "lucide-react"
import { Button } from "@/components/ui/button"
import { enableMovieNightPush, notificationSupport, sendTestPush } from "../lib/push"

type PushRemindersPromptProps = {
  heading?: string
  grantedText?: string
  defaultText?: string
}

export function MovieNightPushPrompt({
  heading = "🍿 Movie Night reminders",
  grantedText = "You will get a ping the day before and the day of a scheduled night.",
  defaultText = "Allow notifications to get a 🍿 alert the day before and the same day.",
}: PushRemindersPromptProps) {
  const [status, setStatus] = useState<"loading" | "unsupported" | "default" | "granted" | "denied" | "error">("loading")
  const [busy, setBusy] = useState(false)
  const [testBusy, setTestBusy] = useState(false)
  const [testMessage, setTestMessage] = useState<string | null>(null)

  useEffect(() => {
    const current = notificationSupport()
    if (current === "granted") {
      void enableMovieNightPush()
        .then(() => setStatus("granted"))
        .catch(() => setStatus("error"))
      return
    }
    setStatus(current)
  }, [])

  const handleEnable = async () => {
    setBusy(true)
    setTestMessage(null)
    try {
      await enableMovieNightPush()
      setStatus("granted")
    } catch (error) {
      if (error instanceof Error && error.message === "denied") {
        setStatus("denied")
      } else {
        setStatus("error")
      }
    } finally {
      setBusy(false)
    }
  }

  const handleTest = async () => {
    setTestBusy(true)
    setTestMessage(null)
    try {
      const result = await sendTestPush()
      setStatus("granted")
      setTestMessage(result.sent ? "Test sent — check your notifications." : "Nothing was sent.")
    } catch {
      setStatus("error")
      setTestMessage("Could not send a test. On iPhone, open the app from the Home Screen.")
    } finally {
      setTestBusy(false)
    }
  }

  if (status === "loading" || status === "unsupported") {
    return null
  }

  return (
    <div className="rounded-md border border-border bg-card px-3 py-3 flex items-start gap-3">
      <div className="mt-0.5 text-primary">
        {status === "granted" ? <BellRing className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{heading}</p>
        {status === "granted" && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {grantedText}
          </p>
        )}
        {status === "default" && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {defaultText}
          </p>
        )}
        {status === "denied" && (
          <p className="text-xs text-muted-foreground mt-0.5">
            Notifications are blocked. Enable them in the browser or phone settings.
          </p>
        )}
        {status === "error" && (
          <p className="text-xs text-muted-foreground mt-0.5">
            Could not enable alerts. On iPhone, add the app to the Home Screen first.
          </p>
        )}
        {testMessage && (
          <p className="text-xs text-muted-foreground mt-1">{testMessage}</p>
        )}
        {status === "default" && (
          <Button size="sm" className="mt-2 h-8" onClick={handleEnable} disabled={busy}>
            {busy ? "Enabling..." : "Enable reminders"}
          </Button>
        )}
        {(status === "granted" || status === "error") && (
          <div className="mt-2 flex flex-wrap gap-2">
            {status === "error" && (
              <Button size="sm" className="h-8" onClick={handleEnable} disabled={busy}>
                {busy ? "Retrying..." : "Retry"}
              </Button>
            )}
            <Button size="sm" variant="outline" className="h-8" onClick={handleTest} disabled={testBusy || busy}>
              {testBusy ? "Sending..." : "Send test"}
            </Button>
          </div>
        )}
        {status === "denied" && (
          <p className="text-xs text-muted-foreground mt-1 inline-flex items-center gap-1">
            <BellOff className="h-3 w-3" />
            Alerts are off
          </p>
        )}
      </div>
    </div>
  )
}
