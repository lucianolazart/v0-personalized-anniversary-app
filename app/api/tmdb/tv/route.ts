import { NextRequest, NextResponse } from "next/server"
import { getTmdbApiKey, TMDB_KEY_MISSING_ERROR } from "@/app/lib/tmdb"
import type { SeriesInfo } from "@/app/lib/episodes"

// Seasons and episodes of a series ("¿Por dónde van?").
//   ?id=123                 by TMDB id
//   ?title=…&year=…         for series saved before we stored TMDB ids
const REVALIDATE_SECONDS = 60 * 60 * 6

interface RawEpisode {
  season_number: number
  episode_number: number
  air_date?: string | null
}

interface RawSeries {
  id: number
  name: string
  status?: string
  seasons?: Array<{ season_number: number; episode_count: number; name: string; air_date?: string | null }>
  last_episode_to_air?: RawEpisode | null
  next_episode_to_air?: RawEpisode | null
}

async function tmdbJson<T>(url: URL): Promise<T | null> {
  const response = await fetch(url, { next: { revalidate: REVALIDATE_SECONDS } })
  if (!response.ok) return null
  return (await response.json()) as T
}

export async function GET(request: NextRequest) {
  const apiKey = getTmdbApiKey()
  if (!apiKey) {
    return NextResponse.json({ error: TMDB_KEY_MISSING_ERROR }, { status: 500 })
  }

  const params = request.nextUrl.searchParams
  try {
    let tmdbId = Number(params.get("id")) || null
    if (!tmdbId) {
      const title = params.get("title")?.trim()
      if (!title) return NextResponse.json({ error: "Falta id o title." }, { status: 400 })
      const search = new URL("https://api.themoviedb.org/3/search/tv")
      search.searchParams.set("api_key", apiKey)
      search.searchParams.set("query", title)
      const year = Number(params.get("year"))
      if (Number.isFinite(year) && year > 1800) search.searchParams.set("first_air_date_year", String(year))
      const found = await tmdbJson<{ results?: Array<{ id: number }> }>(search)
      tmdbId = found?.results?.[0]?.id ?? null
    }
    if (!tmdbId) {
      return NextResponse.json({ error: "No encontramos la serie en TMDB." }, { status: 404 })
    }

    const url = new URL(`https://api.themoviedb.org/3/tv/${tmdbId}`)
    url.searchParams.set("api_key", apiKey)
    url.searchParams.set("language", "es-ES")
    const data = await tmdbJson<RawSeries>(url)
    if (!data) {
      return NextResponse.json({ error: "TMDB no pudo traer la serie." }, { status: 502 })
    }

    const lastAired = data.last_episode_to_air
      ? { season: data.last_episode_to_air.season_number, episode: data.last_episode_to_air.episode_number }
      : null
    const seasons = (data.seasons ?? [])
      // Season 0 holds specials; empty seasons are only announced.
      .filter((season) => season.season_number > 0 && season.episode_count > 0)
      .sort((a, b) => a.season_number - b.season_number)
      .map((season) => ({
        number: season.season_number,
        episodes: season.episode_count,
        name: season.name,
      }))

    const body: SeriesInfo = {
      tmdbId,
      name: data.name,
      status: data.status ?? "",
      seasons,
      lastAired: lastAired && lastAired.season > 0 ? lastAired : null,
      nextToAir: data.next_episode_to_air?.air_date
        ? {
            season: data.next_episode_to_air.season_number,
            episode: data.next_episode_to_air.episode_number,
            airDate: data.next_episode_to_air.air_date,
          }
        : null,
    }
    return NextResponse.json(body)
  } catch {
    return NextResponse.json({ error: "No se pudo conectar con TMDB." }, { status: 502 })
  }
}
