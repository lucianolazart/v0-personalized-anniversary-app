"use client"

import { useEffect, useState } from "react"
import { Minus, Plus } from "lucide-react"
import type { EpisodeRef, MediaWithId } from "../types/media"
import {
  compareEpisodes,
  episodesBetween,
  formatEpisode,
  nextEpisode,
  previousEpisode,
  type SeriesInfo,
} from "../lib/episodes"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

export function seriesInfoUrl(media: Pick<MediaWithId, "title" | "year" | "tmdbId" | "tmdbType">) {
  const params = new URLSearchParams()
  if (media.tmdbId && media.tmdbType === "tv") params.set("id", String(media.tmdbId))
  else {
    params.set("title", media.title)
    params.set("year", String(media.year))
  }
  return `/api/tmdb/tv?${params.toString()}`
}

/** "¿Por dónde van?": season/episode progress for a series, with TMDB's episode list. */
export function EpisodeTracker({
  media,
  onClose,
  onSave,
}: {
  media: MediaWithId | null
  onClose: () => void
  onSave: (media: MediaWithId, progress: EpisodeRef | null, info: SeriesInfo | null) => Promise<void>
}) {
  const [info, setInfo] = useState<SeriesInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<EpisodeRef | undefined>(undefined)
  const [season, setSeason] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  const mediaId = media?.id

  useEffect(() => {
    if (!media) return
    setInfo(null)
    setError(null)
    setProgress(media.progress)
    setSeason(media.progress?.season ?? null)

    const controller = new AbortController()
    fetch(seriesInfoUrl(media), { signal: controller.signal })
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "No se pudo cargar la serie.")
        const series = data as SeriesInfo
        setInfo(series)
        setSeason((current) => current ?? series.lastAired?.season ?? series.seasons[0]?.number ?? null)
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return
        setError(err instanceof Error ? err.message : "No se pudo cargar la serie.")
      })
    return () => controller.abort()
    // Reload only when another series is opened; progress updates come from this dialog itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mediaId])

  const update = async (next: EpisodeRef | null) => {
    if (!media) return
    setProgress(next ?? undefined)
    if (next) setSeason(next.season)
    setSaving(true)
    try {
      await onSave(media, next, info)
    } finally {
      setSaving(false)
    }
  }

  const aired = (ep: EpisodeRef) => !info?.lastAired || compareEpisodes(ep, info.lastAired) <= 0
  const next = info ? nextEpisode(progress, info.seasons) : null
  const canAdvance = Boolean(next && aired(next))
  const remaining = info?.lastAired ? episodesBetween(progress, info.lastAired, info.seasons) : null
  const ended = info?.status === "Ended" || info?.status === "Canceled"
  const seasonInfo = info?.seasons.find((item) => item.number === season)

  let statusLine = ""
  if (info) {
    if (!progress) {
      statusLine = remaining ? `Todavía no empezaron. Hay ${remaining} capítulos.` : "Todavía no empezaron."
    } else if (remaining === 0) {
      if (info.nextToAir) {
        const date = new Date(`${info.nextToAir.airDate}T12:00:00`).toLocaleDateString("es-AR", {
          day: "numeric",
          month: "long",
        })
        statusLine = `Están al día. Sale ${formatEpisode(info.nextToAir)} el ${date}.`
      } else {
        statusLine = ended ? "Terminaron la serie." : "Están al día."
      }
    } else if (remaining !== null) {
      statusLine = `Les ${remaining === 1 ? "falta 1 capítulo" : `faltan ${remaining} capítulos`} para estar al día.`
    }
  }

  return (
    <Dialog open={Boolean(media)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[440px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold tracking-tight">¿Por dónde van?</DialogTitle>
          <DialogDescription>{media?.title}</DialogDescription>
        </DialogHeader>

        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : !info ? (
          <div className="space-y-3" aria-busy>
            <div className="h-28 rounded-2xl bg-accent animate-pulse" />
            <div className="h-11 rounded-lg bg-muted animate-pulse" />
          </div>
        ) : (
          <div className="space-y-5">
            <div className="rounded-2xl bg-accent px-4 py-4">
              <p className="label-mono text-accent-foreground">Último que vieron</p>
              <p className="mt-1.5 font-mono text-[40px] font-semibold leading-none tracking-[-0.04em] tabular-nums">
                {progress ? formatEpisode(progress) : "—"}
              </p>
              <p className="mt-2.5 text-sm text-foreground/80">{statusLine}</p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="h-11 w-11 shrink-0 p-0"
                aria-label="Uno menos"
                disabled={!progress || saving}
                onClick={() => update(previousEpisode(progress, info.seasons))}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <Button
                className="h-11 flex-1 bg-foreground text-background hover:bg-foreground/90"
                disabled={!canAdvance || saving}
                onClick={() => next && update(next)}
              >
                <Plus className="h-4 w-4 mr-1.5" />
                {next && canAdvance ? `Vimos ${formatEpisode(next)}` : "No hay más capítulos"}
              </Button>
            </div>

            <div>
              <p className="label-mono mb-2">Temporadas</p>
              <div className="flex gap-1.5 overflow-x-auto scrollbar-hide -mx-6 px-6">
                {info.seasons.map((item) => (
                  <button
                    key={item.number}
                    type="button"
                    aria-pressed={season === item.number}
                    onClick={() => setSeason(item.number)}
                    className={cn(
                      "h-8 shrink-0 rounded-lg border px-3 font-mono text-[13px] transition-colors",
                      season === item.number
                        ? "border-primary/30 bg-accent font-semibold text-accent-foreground"
                        : "border-border bg-card text-foreground hover:bg-muted"
                    )}
                  >
                    T{item.number}
                  </button>
                ))}
              </div>
            </div>

            {seasonInfo && (
              <div>
                <div className="grid grid-cols-6 gap-1.5">
                  {Array.from({ length: seasonInfo.episodes }, (_, index) => {
                    const ep = { season: seasonInfo.number, episode: index + 1 }
                    const watched = Boolean(progress && compareEpisodes(ep, progress) <= 0)
                    const current = Boolean(progress && compareEpisodes(ep, progress) === 0)
                    const isAired = aired(ep)
                    return (
                      <button
                        key={ep.episode}
                        type="button"
                        disabled={!isAired || saving}
                        aria-label={`Vimos hasta ${formatEpisode(ep)}`}
                        aria-pressed={current}
                        onClick={() => update(ep)}
                        className={cn(
                          "h-10 rounded-lg border font-mono text-sm tabular-nums transition-colors disabled:opacity-35",
                          current
                            ? "border-primary bg-primary font-semibold text-primary-foreground"
                            : watched
                              ? "border-primary/25 bg-accent text-accent-foreground"
                              : "border-border bg-card hover:bg-muted"
                        )}
                      >
                        {ep.episode}
                      </button>
                    )
                  })}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Tocá un capítulo para marcar que vieron hasta ahí.
                </p>
              </div>
            )}

            {progress && (
              <button
                type="button"
                onClick={() => update(null)}
                className="text-xs text-muted-foreground underline underline-offset-2"
              >
                Borrar el progreso
              </button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
