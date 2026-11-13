"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Check } from "lucide-react"
import type { MediaWithId } from "../types/media"
import {
  airDateToDate,
  compareEpisodes,
  formatEpisode,
  nextEpisode,
  type EpisodeDetail,
  type SeriesInfo,
} from "../lib/episodes"
import { fetchSeason, fetchSeriesInfo } from "../lib/tmdb-client"
import { saveSeriesProgress } from "../lib/media"
import { relativeDay, startOfToday } from "../lib/dates"
import { SectionLabel } from "@/components/page-header"
import { DateColumn } from "@/components/date-column"
import { cn } from "@/lib/utils"

const UPCOMING_DAYS = 60

/** Top of Pelis → Series: what to watch next, and new episodes coming soon. */
export function SeriesHub({ series }: { series: MediaWithId[] }) {
  const watching = useMemo(
    () =>
      series
        .filter((media) => media.state === "in-progress" || media.state === "to-resume")
        .sort((a, b) => (a.state === b.state ? a.title.localeCompare(b.title) : a.state === "in-progress" ? -1 : 1)),
    [series]
  )

  const upcoming = useMemo(() => {
    const today = startOfToday().getTime()
    const limit = today + UPCOMING_DAYS * 24 * 60 * 60 * 1000
    return series
      .filter((media) => media.nextToAir && media.state !== "watched")
      .map((media) => ({ media, date: airDateToDate(media.nextToAir!.airDate) }))
      .filter(({ date }) => date.getTime() >= today && date.getTime() <= limit)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
  }, [series])

  if (watching.length === 0 && upcoming.length === 0) return null

  return (
    <div className="space-y-7 pt-1 pb-8">
      {watching.length > 0 && (
        <section>
          <SectionLabel count={watching.length} tone="primary">
            Para ver
          </SectionLabel>
          {watching.map((media) => (
            <UpNextRow key={media.id} media={media} />
          ))}
        </section>
      )}

      {upcoming.length > 0 && (
        <section>
          <SectionLabel count={upcoming.length}>Próximos estrenos</SectionLabel>
          {upcoming.map(({ media, date }) => (
            <Link
              key={media.id}
              href={`/series/${media.id}`}
              className="flex items-center gap-3.5 py-2.5 border-b border-border"
            >
              <DateColumn date={date} highlight />
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold truncate">{media.title}</p>
                <p className="font-mono text-[11px] uppercase text-muted-foreground">
                  {formatEpisode(media.nextToAir!)} · {relativeDay(date)}
                </p>
              </div>
            </Link>
          ))}
        </section>
      )}
    </div>
  )
}

function UpNextRow({ media }: { media: MediaWithId }) {
  const [info, setInfo] = useState<SeriesInfo | null>(null)
  const [failed, setFailed] = useState(false)
  const [detail, setDetail] = useState<EpisodeDetail | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let active = true
    fetchSeriesInfo(media)
      .then((series) => active && setInfo(series))
      .catch(() => active && setFailed(true))
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [media.id, media.tmdbId])

  const next = info ? nextEpisode(media.progress, info.seasons) : null
  const isOut = Boolean(next && (!info?.lastAired || compareEpisodes(next, info.lastAired) <= 0))

  useEffect(() => {
    if (!info || !next || !isOut) {
      setDetail(null)
      return
    }
    let active = true
    fetchSeason(info.tmdbId, next.season)
      .then((season) => active && setDetail(season.episodes.find((item) => item.number === next.episode) ?? null))
      .catch(() => undefined)
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [info, next?.season, next?.episode, isOut])

  const markWatched = async () => {
    if (!next || !info) return
    setSaving(true)
    try {
      await saveSeriesProgress(media, next, info)
    } catch (error) {
      console.error("Error saving progress:", error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex items-center gap-3 py-3 border-b border-border">
      <Link href={`/series/${media.id}`} className="flex min-w-0 flex-1 items-center gap-3">
        {detail?.stillUrl ? (
          <img src={detail.stillUrl} alt="" className="aspect-video w-28 shrink-0 rounded object-cover bg-muted" />
        ) : (
          <img
            src={media.image || "/placeholder.svg?height=450&width=300"}
            alt=""
            className="aspect-video w-28 shrink-0 rounded object-cover object-top bg-muted"
          />
        )}
        <div className="min-w-0">
          <p className="text-[15px] font-semibold leading-tight truncate">{media.title}</p>
          <p
            className={cn(
              "mt-1 font-mono text-[11px] font-semibold uppercase",
              isOut ? "text-primary" : "text-muted-foreground"
            )}
          >
            {failed
              ? "Abrir para ver capítulos"
              : !info
                ? "…"
                : isOut && next
                  ? `${media.progress ? "Sigue" : "Empieza"} ${formatEpisode(next)}`
                  : "Al día"}
          </p>
          {detail && <p className="text-[13px] text-muted-foreground line-clamp-1">{detail.name}</p>}
        </div>
      </Link>
      {isOut && next && (
        <button
          type="button"
          disabled={saving}
          onClick={markWatched}
          aria-label={`Vimos ${formatEpisode(next)} de ${media.title}`}
          className="h-10 w-10 shrink-0 rounded-full border-2 border-border inline-flex items-center justify-center text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-40"
        >
          <Check className="h-4 w-4" strokeWidth={3} />
        </button>
      )}
    </div>
  )
}
