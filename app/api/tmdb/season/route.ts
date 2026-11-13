import { NextRequest, NextResponse } from "next/server"
import { getTmdbApiKey, TMDB_KEY_MISSING_ERROR } from "@/app/lib/tmdb"
import type { SeasonDetail } from "@/app/lib/episodes"

// Episodes of one season, with title, synopsis, date, runtime and a still: ?id=456&season=10
const REVALIDATE_SECONDS = 60 * 60 * 24
const STILL_BASE = "https://image.tmdb.org/t/p/w300"

interface RawSeason {
  name?: string
  episodes?: Array<{
    episode_number: number
    name?: string
    overview?: string
    air_date?: string | null
    runtime?: number | null
    still_path?: string | null
  }>
}

async function season(apiKey: string, id: number, number: number, language: string) {
  const url = new URL(`https://api.themoviedb.org/3/tv/${id}/season/${number}`)
  url.searchParams.set("api_key", apiKey)
  url.searchParams.set("language", language)
  const response = await fetch(url, { next: { revalidate: REVALIDATE_SECONDS } })
  return response.ok ? ((await response.json()) as RawSeason) : null
}

// TMDB fills untranslated titles with "Episodio 12" / "Episode 12".
const isPlaceholder = (name?: string) => !name || /^(episodio|episode|capítulo)\s+\d+$/i.test(name.trim())

export async function GET(request: NextRequest) {
  const apiKey = getTmdbApiKey()
  if (!apiKey) return NextResponse.json({ error: TMDB_KEY_MISSING_ERROR }, { status: 500 })

  const id = Number(request.nextUrl.searchParams.get("id"))
  const number = Number(request.nextUrl.searchParams.get("season"))
  if (!id || !Number.isInteger(number) || number < 0) {
    return NextResponse.json({ error: "Faltan id y season." }, { status: 400 })
  }

  try {
    // Latin American Spanish first; English fills titles and synopses that aren't translated.
    const [spanish, english] = await Promise.all([
      season(apiKey, id, number, "es-MX"),
      season(apiKey, id, number, "en-US"),
    ])
    if (!spanish && !english) {
      return NextResponse.json({ error: "TMDB no pudo traer la temporada." }, { status: 502 })
    }

    const englishByNumber = new Map((english?.episodes ?? []).map((episode) => [episode.episode_number, episode]))
    const ordered = [...(spanish?.episodes ?? english?.episodes ?? [])].sort(
      (a, b) => a.episode_number - b.episode_number
    )
    const body: SeasonDetail = {
      season: number,
      name: spanish?.name || english?.name || `Temporada ${number}`,
      episodes: ordered.map((episode, index) => {
        const fallback = englishByNumber.get(episode.episode_number)
        const name = !isPlaceholder(episode.name) ? episode.name : fallback?.name
        return {
          // Some series (anime like Naruto) number episodes across the whole show (season 3 =
          // 107…160). The app always counts from 1 within each season.
          number: index + 1,
          name: name?.trim() || `Capítulo ${episode.episode_number}`,
          overview: (episode.overview || fallback?.overview || "").trim(),
          airDate: episode.air_date || fallback?.air_date || null,
          runtime: episode.runtime ?? fallback?.runtime ?? null,
          stillUrl: episode.still_path || fallback?.still_path
            ? `${STILL_BASE}${episode.still_path || fallback?.still_path}`
            : null,
        }
      }),
    }
    return NextResponse.json(body)
  } catch {
    return NextResponse.json({ error: "No se pudo conectar con TMDB." }, { status: 502 })
  }
}
