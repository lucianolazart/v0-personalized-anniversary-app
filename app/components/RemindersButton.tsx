"use client"

import { useEffect, useState } from "react"
import { Bell, BellOff } from "lucide-react"
import { enableMovieNightPush, notificationSupport } from "../lib/push"
import { MovieNightPushPrompt } from "./MovieNightPushPrompt"
import { IconButton } from "@/components/page-header"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

type Status = "loading" | "unsupported" | "default" | "granted" | "denied" | "error"

// The subscription is re-saved once per app session, like the reminders card used to do on open.
let resyncedThisSession = false

/** Bell in the page header: shows whether reminders work and opens the reminders card. */
export function RemindersButton(props: { heading?: string; grantedText?: string; defaultText?: string }) {
  const [status, setStatus] = useState<Status>("loading")

  useEffect(() => {
    const current = notificationSupport()
    if (current !== "granted") {
      setStatus(current)
      return
    }
    if (resyncedThisSession) {
      setStatus("granted")
      return
    }
    resyncedThisSession = true
    void enableMovieNightPush()
      .then(() => setStatus("granted"))
      .catch(() => setStatus("error"))
  }, [])

  const label =
    status === "granted"
      ? "Recordatorios activados"
      : status === "error"
        ? "Recordatorios con un problema"
        : "Recordatorios apagados"

  return (
    <Dialog onOpenChange={(open) => !open && setStatus(notificationSupport() === "granted" ? "granted" : notificationSupport())}>
      <DialogTrigger asChild>
        <IconButton aria-label={label} title={label}>
          {status === "denied" || status === "unsupported" ? (
            <BellOff className="h-[18px] w-[18px] text-muted-foreground" />
          ) : (
            <Bell className="h-[18px] w-[18px]" />
          )}
          {status === "granted" && (
            <span className="absolute top-2 right-2.5 h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
          )}
          {status === "error" && (
            <span className="absolute top-2 right-2.5 h-1.5 w-1.5 rounded-full bg-destructive" aria-hidden />
          )}
        </IconButton>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Recordatorios</DialogTitle>
          <DialogDescription>Avisos en este celular para las noches de peli y los planes.</DialogDescription>
        </DialogHeader>
        <MovieNightPushPrompt {...props} />
      </DialogContent>
    </Dialog>
  )
}
