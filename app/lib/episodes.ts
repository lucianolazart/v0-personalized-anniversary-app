import type { EpisodeRef } from "../types/media"

export interface SeasonInfo {
  number: number
  episodes: number
  name: string
}

/** What /api/tmdb/tv returns for a series. */
export interface SeriesInfo {
  tmdbId: number
  name: string
  /** TMDB status: "Returning Series", "Ended", "Canceled"… */
  status: string
  seasons: SeasonInfo[]
  /** Latest episode already released. */
  lastAired: EpisodeRef | null
  nextToAir: (EpisodeRef & { airDate: string }) | null
}

/** One episode as /api/tmdb/season returns it. */
export interface EpisodeDetail {
  number: number
  name: string
  overview: string
  airDate: string | null
  /** Minutes. */
  runtime: number | null
  stillUrl: string | null
}

export interface SeasonDetail {
  season: number
  name: string
  episodes: EpisodeDetail[]
}

export function formatEpisode(ep: EpisodeRef) {
  return `T${ep.season} · E${ep.episode}`
}

export function compareEpisodes(a: EpisodeRef, b: EpisodeRef) {
  return a.season - b.season || a.episode - b.episode
}

export function parseEpisodeRef(value: unknown): EpisodeRef | undefined {
  if (!value || typeof value !== "object") return undefined
  const { season, episode } = value as Record<string, unknown>
  if (typeof season !== "number" || typeof episode !== "number") return undefined
  if (season < 1 || episode < 1) return undefined
  return { season, episode }
}

export function parseNextToAir(value: unknown): (EpisodeRef & { airDate: string }) | undefined {
  const ref = parseEpisodeRef(value)
  const airDate = (value as { airDate?: unknown } | null)?.airDate
  return ref && typeof airDate === "string" ? { ...ref, airDate } : undefined
}

/** "2026-12-02" (TMDB air date) as a local Date at noon, so the day never shifts. */
export function airDateToDate(airDate: string) {
  return new Date(`${airDate}T12:00:00`)
}

/** Episodes watched and released so far, for the progress bar. */
export function seriesProgressCounts(progress: EpisodeRef | undefined, info: SeriesInfo) {
  const total = info.lastAired ? episodesBetween(undefined, info.lastAired, info.seasons) : 0
  const watched = progress ? Math.min(total, episodesBetween(undefined, progress, info.seasons)) : 0
  return { watched, total }
}

export function nextEpisode(ep: EpisodeRef | undefined, seasons: SeasonInfo[]): EpisodeRef | null {
  if (!ep) return seasons[0] ? { season: seasons[0].number, episode: 1 } : null
  const index = seasons.findIndex((season) => season.number === ep.season)
  if (index === -1) return null
  if (ep.episode < seasons[index].episodes) return { season: ep.season, episode: ep.episode + 1 }
  const following = seasons[index + 1]
  return following ? { season: following.number, episode: 1 } : null
}

export function previousEpisode(ep: EpisodeRef | undefined, seasons: SeasonInfo[]): EpisodeRef | null {
  if (!ep) return null
  if (ep.episode > 1) return { season: ep.season, episode: ep.episode - 1 }
  const index = seasons.findIndex((season) => season.number === ep.season)
  const previous = index > 0 ? seasons[index - 1] : null
  return previous ? { season: previous.number, episode: previous.episodes } : null
}

/** Episodes after `from` up to and including `to` (0 when they are caught up). */
export function episodesBetween(from: EpisodeRef | undefined, to: EpisodeRef, seasons: SeasonInfo[]) {
  let count = 0
  for (const season of seasons) {
    for (let episode = 1; episode <= season.episodes; episode++) {
      const current = { season: season.number, episode }
      if (compareEpisodes(current, to) > 0) return count
      if (!from || compareEpisodes(current, from) > 0) count++
    }
  }
  return count
}
