"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { doc, onSnapshot } from "firebase/firestore"
import { ArrowLeft, Check, ChevronDown, Undo2 } from "lucide-react"
import { db } from "../../lib/firebase"
import type { EpisodeRef, MediaWithId } from "../../types/media"
import {
  airDateToDate,
  compareEpisodes,
  formatEpisode,
  nextEpisode,
  previousEpisode,
  seriesProgressCounts,
  type EpisodeDetail,
  type SeasonDetail,
  type SeriesInfo,
} from "../../lib/episodes"
import { fetchSeason, fetchSeriesInfo } from "../../lib/tmdb-client"
import { mediaFromDoc, saveSeriesProgress } from "../../lib/media"
import { STATE_LABELS } from "../../components/MediaCard"
import { Button } from "@/components/ui/button"
import { IconButton, SectionLabel } from "@/components/page-header"
import { cn } from "@/lib/utils"

const STATUS_LABELS: Record<string, string> = {
  "Returning Series": "En emisión",
  Ended: "Finalizada",
  Canceled: "Cancelada",
  "In Production": "En producción",
  Planned: "Anunciada",
}

function shortDate(airDate: string | null) {
  if (!airDate) return ""
  return airDateToDate(airDate).toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" })
}

export default function SeriesPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [media, setMedia] = useState<MediaWithId | null | undefined>(undefined)
  const [info, setInfo] = useState<SeriesInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [seasons, setSeasons] = useState<Record<number, SeasonDetail>>({})
  const [openSeason, setOpenSeason] = useState<number | null>(null)
  const [expandedEpisode, setExpandedEpisode] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [showCompletedSeasons, setShowCompletedSeasons] = useState(false)

  useEffect(() => {
    return onSnapshot(doc(db, "peliculas", id), (snapshot) => {
      setMedia(snapshot.exists() ? mediaFromDoc(snapshot.id, snapshot.data()) : null)
    })
  }, [id])

  // Ask TMDB once per series (the cache keeps it while navigating).
  const lookupKey = media ? `${media.tmdbId ?? ""}-${media.title}-${media.year}` : null
  useEffect(() => {
    if (!media) return
    let active = true
    fetchSeriesInfo(media)
      .then((series) => active && setInfo(series))
      .catch((err: unknown) => active && setError(err instanceof Error ? err.message : "No se pudo cargar la serie."))
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lookupKey])

  const loadSeason = useCallback(
    (number: number) => {
      if (!info || seasons[number]) return
      fetchSeason(info.tmdbId, number)
        .then((detail) => setSeasons((current) => ({ ...current, [number]: detail })))
        .catch(() => undefined)
    },
    [info, seasons]
  )

  const progress = media?.progress
  const next = info ? nextEpisode(progress, info.seasons) : null
  const aired = useCallback(
    (ep: EpisodeRef) => !info?.lastAired || compareEpisodes(ep, info.lastAired) <= 0,
    [info]
  )
  const nextIsOut = Boolean(next && aired(next))

  // Open the season of the next episode, and load what the cards need.
  useEffect(() => {
    if (!info) return
    const focus = (nextIsOut ? next?.season : progress?.season) ?? info.seasons[0]?.number ?? null
    setOpenSeason((current) => current ?? focus)
    if (focus !== null) loadSeason(focus)
    if (progress) loadSeason(progress.season)
    if (next) loadSeason(next.season)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [info, progress?.season, progress?.episode])

  const episodeDetail = (ep: EpisodeRef | null | undefined): EpisodeDetail | undefined =>
    ep ? seasons[ep.season]?.episodes.find((item) => item.number === ep.episode) : undefined

  const counts = useMemo(() => (info ? seriesProgressCounts(progress, info) : null), [info, progress])

  const save = async (value: EpisodeRef | null) => {
    if (!media) return
    setSaving(true)
    try {
      await saveSeriesProgress(media, value, info)
    } catch (err) {
      console.error("Error saving progress:", err)
    } finally {
      setSaving(false)
    }
  }

  if (media === undefined) {
    return (
      <div className="min-h-screen bg-background px-5 pt-12 max-w-xl mx-auto" aria-busy>
        <div className="h-10 w-10 rounded-[10px] bg-muted animate-pulse" />
        <div className="mt-6 h-32 rounded-xl bg-muted animate-pulse" />
      </div>
    )
  }

  if (media === null || media.type !== "serie") {
    return (
      <div className="min-h-screen bg-background px-5 pt-12 max-w-xl mx-auto">
        <p className="text-lg font-semibold">No encontramos esta serie.</p>
        <Link href="/movies" className="mt-2 inline-block text-sm font-semibold text-primary">
          Volver a Pelis y series
        </Link>
      </div>
    )
  }

  const nextDetail = episodeDetail(next)
  const lastDetail = episodeDetail(progress)
  const caughtUp = info && !nextIsOut

  const watchedIn = (season: { number: number; episodes: number }) =>
    !progress
      ? 0
      : progress.season > season.number
        ? season.episodes
        : progress.season === season.number
          ? Math.min(progress.episode, season.episodes)
          : 0
  // Long series (Los Simpson): seasons already fully watched fold into one row.
  const firstUnfinished = info ? info.seasons.findIndex((season) => watchedIn(season) < season.episodes) : -1
  const completedSeasons = info ? (firstUnfinished === -1 ? info.seasons.length : firstUnfinished) : 0
  const visibleSeasons = info
    ? completedSeasons >= 2 && !showCompletedSeasons
      ? info.seasons.slice(completedSeasons)
      : info.seasons
    : []

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur-md">
        <div className="px-5 pt-12 pb-3 max-w-xl mx-auto flex items-center gap-3">
          <IconButton aria-label="Volver" onClick={() => (window.history.length > 1 ? router.back() : router.push("/movies"))}>
            <ArrowLeft className="h-[18px] w-[18px]" />
          </IconButton>
          <p className="min-w-0 truncate text-[15px] font-semibold">{media.title}</p>
        </div>
      </header>

      <main className="px-5 pb-28 max-w-xl mx-auto">
        <section className="mt-2 flex gap-4">
          <img
            src={media.image || "/placeholder.svg?height=450&width=300"}
            alt=""
            className="h-[120px] w-20 shrink-0 rounded-md object-cover bg-muted"
          />
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold leading-tight tracking-[-0.03em]">{media.title}</h1>
            <p className="mt-1 font-mono text-[11px] uppercase text-muted-foreground">
              {media.year}
              {info?.status ? ` · ${STATUS_LABELS[info.status] ?? info.status}` : ""} · {STATE_LABELS[media.state]}
            </p>
            {counts && counts.total > 0 && (
              <div className="mt-3">
                <div className="h-1.5 rounded-full bg-border overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.round((counts.watched / counts.total) * 100)}%` }}
                  />
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Vieron <span className="font-semibold text-foreground tabular-nums">{counts.watched}</span> de{" "}
                  <span className="tabular-nums">{counts.total}</span> capítulos ·{" "}
                  {Math.round((counts.watched / counts.total) * 100)}%
                </p>
              </div>
            )}
          </div>
        </section>

        {error ? (
          <p className="mt-6 text-sm text-destructive">{error}</p>
        ) : !info ? (
          <div className="mt-6 space-y-3" aria-busy>
            <div className="aspect-video rounded-2xl bg-accent animate-pulse" />
            <div className="h-12 rounded-lg bg-muted animate-pulse" />
          </div>
        ) : (
          <>
            <section className="mt-6 overflow-hidden rounded-2xl bg-accent">
              {nextIsOut && next ? (
                <>
                  {nextDetail?.stillUrl ? (
                    <img src={nextDetail.stillUrl} alt="" className="aspect-video w-full object-cover" />
                  ) : (
                    <div className="aspect-video w-full bg-primary/10" aria-hidden />
                  )}
                  <div className="p-4">
                    <p className="label-mono font-semibold text-accent-foreground">Siguiente · {formatEpisode(next)}</p>
                    <p className="mt-1 text-lg font-semibold leading-snug">{nextDetail?.name ?? "…"}</p>
                    {nextDetail && (
                      <p className="mt-0.5 font-mono text-[11px] uppercase text-muted-foreground">
                        {shortDate(nextDetail.airDate)}
                        {nextDetail.runtime ? ` · ${nextDetail.runtime} min` : ""}
                      </p>
                    )}
                    {nextDetail?.overview && (
                      <p className="mt-2 text-sm leading-relaxed text-foreground/80 line-clamp-4">{nextDetail.overview}</p>
                    )}
                    <div className="mt-4 flex gap-2">
                      {progress && (
                        <Button
                          variant="outline"
                          className="h-11 w-11 shrink-0 bg-card p-0"
                          aria-label="Deshacer el último"
                          disabled={saving}
                          onClick={() => save(previousEpisode(progress, info.seasons))}
                        >
                          <Undo2 className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        className="h-11 flex-1 bg-foreground text-background hover:bg-foreground/90"
                        disabled={saving}
                        onClick={() => save(next)}
                      >
                        <Check className="h-4 w-4 mr-1.5" />
                        Vimos este
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-4">
                  <p className="label-mono font-semibold text-accent-foreground">
                    {info.status === "Ended" || info.status === "Canceled" ? "Terminada" : "Están al día"}
                  </p>
                  <p className="mt-1 text-lg font-semibold leading-snug">
                    {info.nextToAir
                      ? `Sale ${formatEpisode(info.nextToAir)} el ${airDateToDate(info.nextToAir.airDate).toLocaleDateString("es-AR", { day: "numeric", month: "long" })}`
                      : info.status === "Ended" || info.status === "Canceled"
                        ? "Vieron todos los capítulos"
                        : "Todavía no hay fecha para el próximo capítulo"}
                  </p>
                  {progress && (
                    <Button
                      variant="outline"
                      className="mt-4 h-10 bg-card"
                      disabled={saving}
                      onClick={() => save(previousEpisode(progress, info.seasons))}
                    >
                      <Undo2 className="h-4 w-4 mr-1.5" />
                      Deshacer el último
                    </Button>
                  )}
                </div>
              )}
            </section>

            {progress && (
              <p className="mt-3 text-[13px] text-muted-foreground">
                Último que vieron: <span className="font-mono">{formatEpisode(progress)}</span>
                {lastDetail ? ` · ${lastDetail.name}` : ""}
              </p>
            )}
            {!progress && !caughtUp && (
              <p className="mt-3 text-[13px] text-muted-foreground">Todavía no marcaron ningún capítulo.</p>
            )}

            <section className="mt-8">
              <SectionLabel count={info.seasons.length}>Temporadas</SectionLabel>
              {completedSeasons >= 2 && (
                <button
                  type="button"
                  aria-expanded={showCompletedSeasons}
                  onClick={() => setShowCompletedSeasons(!showCompletedSeasons)}
                  className="flex h-14 w-full items-center gap-3 border-b border-border text-left"
                >
                  <span className="flex-1 text-[15px] font-semibold">
                    Temporadas 1 a {info.seasons[completedSeasons - 1].number}
                  </span>
                  <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                    <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                    Todas vistas
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-[18px] w-[18px] text-muted-foreground transition-transform",
                      showCompletedSeasons && "rotate-180"
                    )}
                  />
                </button>
              )}
              {visibleSeasons.map((season) => {
                const isOpen = openSeason === season.number
                const watchedInSeason = watchedIn(season)
                const detail = seasons[season.number]
                return (
                  <div key={season.number} className="border-b border-border">
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() => {
                        setOpenSeason(isOpen ? null : season.number)
                        if (!isOpen) loadSeason(season.number)
                      }}
                      className="flex h-14 w-full items-center gap-3 text-left"
                    >
                      <span className="flex-1 text-[15px] font-semibold">Temporada {season.number}</span>
                      <span className="h-1 w-14 overflow-hidden rounded-full bg-border" aria-hidden>
                        <span
                          className="block h-full rounded-full bg-primary"
                          style={{ width: `${(watchedInSeason / season.episodes) * 100}%` }}
                        />
                      </span>
                      <span className="w-12 text-right font-mono text-xs tabular-nums text-muted-foreground">
                        {watchedInSeason}/{season.episodes}
                      </span>
                      <ChevronDown
                        className={cn("h-[18px] w-[18px] text-muted-foreground transition-transform", isOpen && "rotate-180")}
                      />
                    </button>

                    {isOpen && (
                      <div className="pb-3">
                        {!detail ? (
                          <div className="space-y-2 pb-2" aria-busy>
                            {[0, 1, 2].map((key) => (
                              <div key={key} className="h-[54px] rounded-lg bg-muted animate-pulse" />
                            ))}
                          </div>
                        ) : (
                          detail.episodes.map((episode) => {
                            const ep = { season: season.number, episode: episode.number }
                            const watched = Boolean(progress && compareEpisodes(ep, progress) <= 0)
                            const isAired = aired(ep)
                            const key = `${ep.season}-${ep.episode}`
                            const expanded = expandedEpisode === key
                            return (
                              <div key={key}>
                                <div className="flex items-center gap-3 py-2">
                                  <button
                                    type="button"
                                    aria-expanded={expanded}
                                    onClick={() => setExpandedEpisode(expanded ? null : key)}
                                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                                  >
                                    {episode.stillUrl ? (
                                      <img
                                        src={episode.stillUrl}
                                        alt=""
                                        loading="lazy"
                                        className={cn(
                                          "aspect-video w-24 shrink-0 rounded object-cover bg-muted",
                                          watched && "opacity-60"
                                        )}
                                      />
                                    ) : (
                                      <span className="aspect-video w-24 shrink-0 rounded bg-muted" aria-hidden />
                                    )}
                                    <span className="min-w-0">
                                      <span className="block font-mono text-[11px] uppercase text-muted-foreground">
                                        E{episode.number}
                                        {episode.airDate ? ` · ${isAired ? shortDate(episode.airDate) : `sale el ${shortDate(episode.airDate)}`}` : ""}
                                      </span>
                                      <span
                                        className={cn(
                                          "block text-sm font-semibold leading-snug line-clamp-2",
                                          watched && "text-muted-foreground"
                                        )}
                                      >
                                        {episode.name}
                                      </span>
                                    </span>
                                  </button>
                                  <button
                                    type="button"
                                    disabled={!isAired || saving}
                                    aria-pressed={watched}
                                    aria-label={watched ? `Desmarcar ${formatEpisode(ep)}` : `Vimos hasta ${formatEpisode(ep)}`}
                                    onClick={() => save(watched ? previousEpisode(ep, info.seasons) : ep)}
                                    className={cn(
                                      "h-9 w-9 shrink-0 rounded-full border-2 inline-flex items-center justify-center transition-colors disabled:opacity-30",
                                      watched
                                        ? "border-primary bg-primary text-primary-foreground"
                                        : "border-border text-transparent hover:border-primary/50"
                                    )}
                                  >
                                    <Check className="h-4 w-4" strokeWidth={3} />
                                  </button>
                                </div>
                                {expanded && (
                                  <p className="pb-3 pl-[108px] text-[13px] leading-relaxed text-muted-foreground">
                                    {episode.overview || "Sin sinopsis."}
                                    {episode.runtime ? ` · ${episode.runtime} min` : ""}
                                  </p>
                                )}
                              </div>
                            )
                          })
                        )}
                        {detail && (watchedInSeason < season.episodes) && aired({ season: season.number, episode: season.episodes }) && (
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => save({ season: season.number, episode: season.episodes })}
                            className="mt-1 text-[13px] font-semibold text-primary"
                          >
                            Marcar toda la temporada como vista
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </section>

            {progress && (
              <button
                type="button"
                disabled={saving}
                onClick={() => save(null)}
                className="mt-6 text-xs text-muted-foreground underline underline-offset-2"
              >
                Borrar el progreso
              </button>
            )}
            <p className="mt-6 text-[10px] text-muted-foreground">Datos e imágenes de TMDB.</p>
          </>
        )}
      </main>
    </div>
  )
}
