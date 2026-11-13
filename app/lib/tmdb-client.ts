import type { MediaWithId } from "../types/media"
import type { SeasonDetail, SeriesInfo } from "./episodes"

// Browser-side TMDB helpers. Requests are cached per page session so moving between the
// series list and a series page doesn't ask TMDB again.
const seriesCache = new Map<string, Promise<SeriesInfo>>()
const seasonCache = new Map<string, Promise<SeasonDetail>>()

export function seriesInfoUrl(media: Pick<MediaWithId, "title" | "year" | "tmdbId" | "tmdbType">) {
  const params = new URLSearchParams()
  if (media.tmdbId && media.tmdbType === "tv") params.set("id", String(media.tmdbId))
  else {
    params.set("title", media.title)
    params.set("year", String(media.year))
  }
  return `/api/tmdb/tv?${params.toString()}`
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as { error?: string }).error || "No se pudo conectar con TMDB.")
  return data as T
}

function cached<T>(cache: Map<string, Promise<T>>, url: string) {
  let pending = cache.get(url)
  if (!pending) {
    pending = getJson<T>(url).catch((error) => {
      cache.delete(url)
      throw error
    })
    cache.set(url, pending)
  }
  return pending
}

export function fetchSeriesInfo(media: Pick<MediaWithId, "title" | "year" | "tmdbId" | "tmdbType">) {
  return cached(seriesCache, seriesInfoUrl(media))
}

export function fetchSeason(tmdbId: number, season: number) {
  return cached(seasonCache, `/api/tmdb/season?id=${tmdbId}&season=${season}`)
}
