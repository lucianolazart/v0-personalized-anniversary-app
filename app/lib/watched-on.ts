import type { WatchedOn } from "../types/media"

/** Reads a `watchedOn` field from Firestore, ignoring anything malformed. */
export function parseWatchedOn(value: unknown): WatchedOn | undefined {
  if (!value || typeof value !== "object") return undefined
  const data = value as Record<string, unknown>
  if (data.kind === "cine" || data.kind === "pirata") return { kind: data.kind }
  if (
    data.kind === "streaming" &&
    typeof data.providerId === "number" &&
    typeof data.name === "string" &&
    typeof data.logoUrl === "string"
  ) {
    return { kind: "streaming", providerId: data.providerId, name: data.name, logoUrl: data.logoUrl }
  }
  return undefined
}

export function watchedOnLabel(value: WatchedOn) {
  if (value.kind === "cine") return "en el cine"
  if (value.kind === "pirata") return "pirata"
  return `en ${value.name}`
}

export function sameWatchedOn(a?: WatchedOn, b?: WatchedOn) {
  if (!a || !b || a.kind !== b.kind) return false
  return a.kind !== "streaming" || (b.kind === "streaming" && a.providerId === b.providerId)
}
