"use client"

import { useEffect, useState } from "react"
import { Bell, BellOff, BellRing } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  PushSetupError,
  enableMovieNightPush,
  notificationSupport,
  pushErrorMessage,
  sendTestPush,
} from "../lib/push"

type PushRemindersPromptProps = {
  heading?: string
  grantedText?: string
  defaultText?: string
}

export function MovieNightPushPrompt({
  heading = "🍿 Recordatorios de noche de peli",
  grantedText = "Te avisamos el día antes y el mismo día de cada noche agendada.",
  defaultText = "Activá las notificaciones para recibir un aviso 🍿 el día antes y el mismo día.",
}: PushRemindersPromptProps) {
  const [status, setStatus] = useState<"loading" | "unsupported" | "default" | "granted" | "denied" | "error">("loading")
  const [busy, setBusy] = useState(false)
  const [testBusy, setTestBusy] = useState(false)
  const [testMessage, setTestMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    const current = notificationSupport()
    if (current === "granted") {
      // Re-saves this device's subscription every time the app opens.
      void enableMovieNightPush()
        .then(() => setStatus("granted"))
        .catch((error) => {
          setErrorMessage(pushErrorMessage(error))
          setStatus("error")
        })
      return
    }
    setStatus(current)
  }, [])

  const handleEnable = async () => {
    setBusy(true)
    setTestMessage(null)
    setErrorMessage(null)
    try {
      await enableMovieNightPush()
      setStatus("granted")
    } catch (error) {
      if (error instanceof PushSetupError && error.code === "denied") {
        setStatus("denied")
      } else {
        setErrorMessage(pushErrorMessage(error))
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
      setErrorMessage(null)
      setTestMessage(result.sent ? "Prueba enviada: fijate en tus notificaciones." : "No se envió nada.")
    } catch (error) {
      setTestMessage(pushErrorMessage(error))
    } finally {
      setTestBusy(false)
    }
  }

  if (status === "loading") {
    return null
  }

  if (status === "unsupported") {
    return (
      <div className="rounded-md border border-border bg-card px-3 py-3 flex items-start gap-3">
        <div className="mt-0.5 text-muted-foreground">
          <BellOff className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{heading}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Las notificaciones no están disponibles acá. En iPhone (iOS 16.4 o más), tocá Compartir →
            Agregar a inicio y abrí la app desde ese ícono.
          </p>
        </div>
      </div>
    )
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
            Las notificaciones están bloqueadas. Activalas en la configuración del navegador o del celular.
          </p>
        )}
        {status === "error" && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {errorMessage ?? "No se pudieron activar los avisos. En iPhone, primero agregá la app a la pantalla de inicio."}
          </p>
        )}
        {testMessage && (
          <p className="text-xs text-muted-foreground mt-1">{testMessage}</p>
        )}
        {status === "default" && (
          <Button size="sm" className="mt-2 h-8" onClick={handleEnable} disabled={busy}>
            {busy ? "Activando..." : "Activar recordatorios"}
          </Button>
        )}
        {(status === "granted" || status === "error") && (
          <div className="mt-2 flex flex-wrap gap-2">
            {status === "error" && (
              <Button size="sm" className="h-8" onClick={handleEnable} disabled={busy}>
                {busy ? "Reintentando..." : "Reintentar"}
              </Button>
            )}
            <Button size="sm" variant="outline" className="h-8" onClick={handleTest} disabled={testBusy || busy}>
              {testBusy ? "Enviando..." : "Enviar prueba"}
            </Button>
          </div>
        )}
        {status === "denied" && (
          <p className="text-xs text-muted-foreground mt-1 inline-flex items-center gap-1">
            <BellOff className="h-3 w-3" />
            Avisos apagados
          </p>
        )}
      </div>
    </div>
  )
}
