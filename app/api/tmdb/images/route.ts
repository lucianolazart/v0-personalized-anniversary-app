import { NextRequest, NextResponse } from "next/server"
import { TMDB_API_KEY, TMDB_IMAGE_BASE } from "@/app/lib/tmdb"
import type { TmdbPoster } from "@/app/types/tmdb"

interface TmdbImageItem {
  file_path: string
  vote_average?: number
  vote_count?: number
}

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id")?.trim() ?? ""
  const mediaType = request.nextUrl.searchParams.get("type")?.trim() ?? ""

  if (!id || (mediaType !== "movie" && mediaType !== "tv")) {
    return NextResponse.json(
      { error: "Faltan id y type (movie o tv)." },
      { status: 400 }
    )
  }

  const url = new URL(`https://api.themoviedb.org/3/${mediaType}/${id}/images`)
  url.searchParams.set("api_key", TMDB_API_KEY)
  url.searchParams.set("include_image_language", "es,en,null")

  try {
    const response = await fetch(url, { next: { revalidate: 60 } })
    if (!response.ok) {
      return NextResponse.json(
        { error: "TMDB no pudo traer las portadas." },
        { status: 502 }
      )
    }

    const data = (await response.json()) as { posters?: TmdbImageItem[] }
    const seen = new Set<string>()
    const posters: TmdbPoster[] = (data.posters ?? [])
      .filter((item) => Boolean(item.file_path))
      .sort((a, b) => (b.vote_average ?? 0) - (a.vote_average ?? 0))
      .reduce<TmdbPoster[]>((acc, item) => {
        if (seen.has(item.file_path)) return acc
        seen.add(item.file_path)
        acc.push({ url: `${TMDB_IMAGE_BASE}${item.file_path}` })
        return acc
      }, [])
      .slice(0, 24)

    return NextResponse.json({ posters })
  } catch {
    return NextResponse.json(
      { error: "No se pudo conectar con TMDB." },
      { status: 502 }
    )
  }
}
