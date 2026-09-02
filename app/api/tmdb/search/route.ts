import { NextRequest, NextResponse } from "next/server"
import { TMDB_API_KEY, TMDB_IMAGE_BASE } from "@/app/lib/tmdb"
import type { TmdbSearchResult } from "@/app/types/tmdb"

interface TmdbMultiItem {
  id: number
  media_type: string
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

  const url = new URL("https://api.themoviedb.org/3/search/multi")
  url.searchParams.set("api_key", TMDB_API_KEY)
  url.searchParams.set("query", query)
  url.searchParams.set("include_adult", "false")
  url.searchParams.set("language", "es-ES")

  try {
    const response = await fetch(url, { next: { revalidate: 60 } })
    if (!response.ok) {
      return NextResponse.json(
        { error: "TMDB no pudo completar la búsqueda." },
        { status: 502 }
      )
    }

    const data = (await response.json()) as { results?: TmdbMultiItem[] }
    const results: TmdbSearchResult[] = (data.results ?? [])
      .filter(
        (item) =>
          (item.media_type === "movie" || item.media_type === "tv") &&
          Boolean(item.poster_path)
      )
      .slice(0, 12)
      .map((item) => {
        const isMovie = item.media_type === "movie"
        return {
          id: item.id,
          title: (isMovie ? item.title : item.name) || "Sin título",
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
