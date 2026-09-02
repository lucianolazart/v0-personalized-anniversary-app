import { NextRequest, NextResponse } from "next/server"
import { parseTmdbLang, TMDB_API_KEY, TMDB_IMAGE_BASE } from "@/app/lib/tmdb"
import type { TmdbSearchResult } from "@/app/types/tmdb"

interface TmdbSearchItem {
  id: number
  media_type?: string
  title?: string
  name?: string
  release_date?: string
  first_air_date?: string
  poster_path: string | null
}

function parseYear(date?: string) {
  if (!date) return new Date().getFullYear()
  const year = Number(date.slice(0, 4))
  return Number.isFinite(year) && year > 0 ? year : new Date().getFullYear()
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? ""
  if (query.length < 2) {
    return NextResponse.json({ results: [] })
  }

  const lang = parseTmdbLang(request.nextUrl.searchParams.get("lang"))
  const type = request.nextUrl.searchParams.get("type")
  const moviesOnly = type === "movie"

  const url = new URL(
    moviesOnly
      ? "https://api.themoviedb.org/3/search/movie"
      : "https://api.themoviedb.org/3/search/multi"
  )
  url.searchParams.set("api_key", TMDB_API_KEY)
  url.searchParams.set("query", query)
  url.searchParams.set("include_adult", "false")
  url.searchParams.set("language", lang)

  try {
    const response = await fetch(url, { next: { revalidate: 60 } })
    if (!response.ok) {
      return NextResponse.json(
        { error: "TMDB no pudo completar la búsqueda." },
        { status: 502 }
      )
    }

    const data = (await response.json()) as { results?: TmdbSearchItem[] }
    const results: TmdbSearchResult[] = (data.results ?? [])
      .filter((item) => {
        if (!item.poster_path) return false
        if (moviesOnly) return true
        return item.media_type === "movie" || item.media_type === "tv"
      })
      .slice(0, 12)
      .map((item) => {
        const isMovie = moviesOnly || item.media_type === "movie"
        return {
          id: item.id,
          title: (isMovie ? item.title : item.name) || "Untitled",
          year: parseYear(isMovie ? item.release_date : item.first_air_date),
          type: isMovie ? "pelicula" : "serie",
          posterUrl: `${TMDB_IMAGE_BASE}${item.poster_path}`,
          mediaType: isMovie ? "movie" : "tv",
        }
      })

    return NextResponse.json({ results })
  } catch {
    return NextResponse.json(
      { error: "No se pudo conectar con TMDB." },
      { status: 502 }
    )
  }
}
