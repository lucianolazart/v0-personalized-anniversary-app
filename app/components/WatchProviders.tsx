"use client"

import { useEffect, useState } from "react"
import type { TmdbProvider, TmdbProvidersResponse } from "../types/tmdb"
import { cn } from "@/lib/utils"

interface WatchProvidersProps {
  title: string
  year?: number
  type: "pelicula" | "serie"
  tmdbId?: number
  className?: string
}

type State =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; data: TmdbProvidersResponse }

/** "Dónde ver": streaming services in Argentina with their logos (TMDB / JustWatch data). */
export function WatchProviders({ title, year, type, tmdbId, className }: WatchProvidersProps) {
  const [state, setState] = useState<State>({ status: "loading" })

  useEffect(() => {
    const params = new URLSearchParams({ type: type === "serie" ? "tv" : "movie" })
    if (tmdbId) params.set("id", String(tmdbId))
    else {
      params.set("title", title)
      if (year) params.set("year", String(year))
    }

    const controller = new AbortController()
    setState({ status: "loading" })
    fetch(`/api/tmdb/providers?${params.toString()}`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(String(res.status))
        setState({ status: "ready", data: (await res.json()) as TmdbProvidersResponse })
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return
        setState({ status: "error" })
      })
    return () => controller.abort()
  }, [title, year, type, tmdbId])

  // Availability is a nice-to-have: if TMDB fails, show nothing rather than an error.
  if (state.status === "error") return null

  if (state.status === "loading") {
    return (
      <div className={cn("flex items-center gap-2", className)} aria-hidden>
        <div className="h-3 w-16 rounded bg-muted animate-pulse" />
        <div className="h-7 w-7 rounded-md bg-muted animate-pulse" />
        <div className="h-7 w-7 rounded-md bg-muted animate-pulse" />
      </div>
    )
  }

  const { streaming, rent, link, inCinemas } = state.data
  const hasAny = streaming.length > 0 || rent.length > 0

  return (
    <div className={cn("space-y-1.5", className)}>
      {streaming.length > 0 && <ProviderRow label="Dónde ver" providers={streaming} />}
      {inCinemas && <EmojiBadge emoji="🍿" label="En cines" />}
      {streaming.length === 0 && !inCinemas && rent.length > 0 && (
        <ProviderRow label="Para alquilar" providers={rent} />
      )}
      {!hasAny && !inCinemas && <EmojiBadge emoji="🏴‍☠️" label="No está en ninguna plataforma" />}
      {hasAny && (
        <p className="text-[10px] text-muted-foreground">
          {link ? (
            <a href={link} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
              Datos de JustWatch
            </a>
          ) : (
            "Datos de JustWatch"
          )}
        </p>
      )}
    </div>
  )
}

function EmojiBadge({ emoji, label }: { emoji: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="h-7 w-7 rounded-md border border-border bg-muted inline-flex items-center justify-center text-base leading-none"
        aria-hidden
      >
        {emoji}
      </span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  )
}

function ProviderRow({ label, providers }: { label: string; providers: TmdbProvider[] }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-muted-foreground">{label}</span>
      <ul className="flex items-center gap-1.5 flex-wrap">
        {providers.slice(0, 6).map((provider) => (
          <li key={provider.id}>
            <img
              src={provider.logoUrl}
              alt={provider.name}
              title={provider.name}
              width={28}
              height={28}
              className="h-7 w-7 rounded-md border border-border object-cover"
              loading="lazy"
            />
          </li>
        ))}
      </ul>
    </div>
  )
}
