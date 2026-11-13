// Server-only VAPID config. Never hardcode the private key here: it lives in the hosting
// env vars (VAPID_PRIVATE_KEY) next to NEXT_PUBLIC_VAPID_PUBLIC_KEY.
import { VAPID_PUBLIC_KEY } from "./vapid-public"

export { VAPID_PUBLIC_KEY }

const DEFAULT_SUBJECT = "mailto:lazarski@aniversario.app"

export class VapidConfigError extends Error {
  constructor(missing: string[]) {
    super(`Faltan variables VAPID en el servidor: ${missing.join(", ")}`)
    this.name = "VapidConfigError"
  }
}

export function getVapidConfig() {
  const publicKey = VAPID_PUBLIC_KEY
  const privateKey = (process.env.VAPID_PRIVATE_KEY ?? "").trim()
  const subject = (process.env.VAPID_SUBJECT ?? "").trim() || DEFAULT_SUBJECT

  const missing: string[] = []
  if (!publicKey) missing.push("NEXT_PUBLIC_VAPID_PUBLIC_KEY")
  if (!privateKey) missing.push("VAPID_PRIVATE_KEY")
  if (missing.length > 0) {
    throw new VapidConfigError(missing)
  }

  return { publicKey, privateKey, subject }
}
