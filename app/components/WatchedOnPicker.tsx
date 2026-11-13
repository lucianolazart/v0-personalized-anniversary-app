"use client"

import { useEffect, useState } from "react"
import type { WatchedOn } from "../types/media"
import type { TmdbProvider, TmdbProvidersResponse } from "../types/tmdb"
import { sameWatchedOn, watchedOnLabel } from "../lib/watched-on"
import { cn } from "@/lib/utils"

interface WatchedOnOptionsProps {
  title: string
  year?: number
  type: "pelicula" | "serie"
  tmdbId?: number
  value?: WatchedOn
  onPick: (value: WatchedOn) => void
}

/**
 * "¿Dónde la vieron?": the services that have the title now, then the most common ones in
 * Argentina (it may have left the service since), plus cinema and pirata.
 */
export function WatchedOnOptions({ title, year, type, tmdbId, value, onPick }: WatchedOnOptionsProps) {
  const [providers, setProviders] = useState<TmdbProvider[] | null>(null)

  useEffect(() => {
    const tmdbType = type === "serie" ? "tv" : "movie"
    const titleParams = new URLSearchParams({ type: tmdbType })
    if (tmdbId) titleParams.set("id", String(tmdbId))
    else {
      titleParams.set("title", title)
      if (year) titleParams.set("year", String(year))
    }

    const controller = new AbortController()
    const load = async (url: string) => {
      try {
        const res = await fetch(url, { signal: controller.signal })
        return res.ok ? await res.json() : null
      } catch {
        return null
      }
    }

    void Promise.all([
      load(`/api/tmdb/providers?${titleParams.toString()}`),
      load(`/api/tmdb/providers?type=${tmdbType}&list=1`),
    ]).then(([forTitle, common]) => {
      if (controller.signal.aborted) return
      const seen = new Set<number>()
      const merged = [
        ...((forTitle as TmdbProvidersResponse | null)?.streaming ?? []),
        ...((common as { providers?: TmdbProvider[] } | null)?.providers ?? []),
      ].filter((provider) => {
        if (seen.has(provider.id)) return false
        seen.add(provider.id)
        return true
      })
      setProviders(merged.slice(0, 9))
    })

    return () => controller.abort()
  }, [title, year, type, tmdbId])

  const options: WatchedOn[] = [
    ...(providers ?? []).map(
      (provider): WatchedOn => ({
        kind: "streaming",
        providerId: provider.id,
        name: provider.name,
        logoUrl: provider.logoUrl,
      })
    ),
    { kind: "cine" },
    { kind: "pirata" },
  ]

  return (
    <div className="grid grid-cols-3 gap-2">
      {providers === null &&
        Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="h-[84px] rounded-lg bg-muted animate-pulse" aria-hidden />
        ))}
      {options.map((option) => {
        const selected = sameWatchedOn(option, value)
        const key = option.kind === "streaming" ? `p-${option.providerId}` : option.kind
        return (
          <button
            key={key}
            type="button"
            onClick={() => onPick(option)}
            aria-pressed={selected}
            className={cn(
              "h-[84px] rounded-lg border bg-card px-1 flex flex-col items-center justify-center gap-1.5 transition-colors",
              selected ? "border-primary ring-2 ring-primary" : "border-border hover:bg-accent"
            )}
          >
            <WatchedOnIcon value={option} size="lg" />
            <span className="text-[11px] leading-tight text-center line-clamp-2">
              {option.kind === "streaming" ? option.name : option.kind === "cine" ? "Cine" : "Pirata"}
            </span>
          </button>
        )
      })}
    </div>
  )
}

/** The service logo, 🍿 for cinema or 🏴‍☠️ for pirata. */
export function WatchedOnIcon({ value, size = "sm" }: { value: WatchedOn; size?: "sm" | "lg" }) {
  const box = size === "lg" ? "h-9 w-9 text-xl" : "h-5 w-5 text-xs"
  if (value.kind === "streaming") {
    return (
      <img
        src={value.logoUrl}
        alt=""
        title={value.name}
        className={cn(box, "rounded-md border border-border object-cover shrink-0")}
        loading="lazy"
      />
    )
  }
  return (
    <span
      className={cn(box, "rounded-md bg-muted inline-flex items-center justify-center leading-none shrink-0")}
      title={watchedOnLabel(value)}
      aria-hidden
    >
      {value.kind === "cine" ? "🍿" : "🏴‍☠️"}
    </span>
  )
}
