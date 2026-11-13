import { NextRequest, NextResponse } from "next/server"
import { getTmdbApiKey, TMDB_KEY_MISSING_ERROR } from "@/app/lib/tmdb"
import type { TmdbProvider, TmdbProvidersResponse } from "@/app/types/tmdb"

// Streaming availability in Argentina, from TMDB (data provided by JustWatch).
//   ?type=movie|tv&id=123            providers for one title
//   ?type=movie|tv&title=…&year=…    same, for titles saved before we stored TMDB ids
//   ?type=movie|tv&list=1            the most common services in Argentina (for "¿Dónde la vieron?")
const COUNTRY = "AR"
const LOGO_BASE = "https://image.tmdb.org/t/p/w92"
const REVALIDATE_SECONDS = 60 * 60 * 12
const DAY_MS = 1000 * 60 * 60 * 24

interface RawProvider {
  provider_id: number
  provider_name: string
  logo_path: string | null
  display_priority?: number
  display_priorities?: Record<string, number>
}

interface RawCountryProviders {
  link?: string
  flatrate?: RawProvider[]
  free?: RawProvider[]
  ads?: RawProvider[]
  rent?: RawProvider[]
  buy?: RawProvider[]
}

interface RawReleaseDates {
  results?: Array<{ iso_3166_1: string; release_dates: Array<{ type: number; release_date: string }> }>
}

function toProviders(...lists: Array<RawProvider[] | undefined>): TmdbProvider[] {
  const seen = new Set<number>()
  return lists
    .flatMap((list) => list ?? [])
    .sort((a, b) => (a.display_priority ?? 999) - (b.display_priority ?? 999))
    .filter((item) => {
      if (!item.logo_path || seen.has(item.provider_id)) return false
      seen.add(item.provider_id)
      return true
    })
    .map((item) => ({
      id: item.provider_id,
      name: item.provider_name,
      logoUrl: `${LOGO_BASE}${item.logo_path}`,
    }))
}

/**
 * TMDB release types: 2 limited theatrical, 3 theatrical, 4 digital.
 * "En cines" = a theatrical release in Argentina between two weeks ahead and ten weeks ago,
 * with no digital release yet. Without Argentine dates, fall back to any country's premiere.
 */
function isInCinemas(releases: RawReleaseDates | null, now = Date.now()) {
  const countries = releases?.results ?? []
  const dates = (country: string | null, types: number[]) =>
    countries
      .filter((item) => country === null || item.iso_3166_1 === country)
      .flatMap((item) => item.release_dates)
      .filter((item) => types.includes(item.type))
      .map((item) => new Date(item.release_date).getTime())
      .filter((time) => Number.isFinite(time))

  let theatrical = dates(COUNTRY, [2, 3])
  let digital = dates(COUNTRY, [4])
  let windowDays = 70
  if (theatrical.length === 0) {
    theatrical = dates(null, [3])
    digital = []
    windowDays = 45
  }
  if (theatrical.length === 0) return false

  const daysSincePremiere = (now - Math.min(...theatrical)) / DAY_MS
  if (daysSincePremiere < -14 || daysSincePremiere > windowDays) return false
  return !digital.some((time) => time <= now)
}

async function tmdbJson<T>(url: URL): Promise<T | null> {
  const response = await fetch(url, { next: { revalidate: REVALIDATE_SECONDS } })
  if (!response.ok) return null
  return (await response.json()) as T
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const type = params.get("type")
  if (type !== "movie" && type !== "tv") {
    return NextResponse.json({ error: "Falta type (movie o tv)." }, { status: 400 })
  }

  const apiKey = getTmdbApiKey()
  if (!apiKey) {
    return NextResponse.json({ error: TMDB_KEY_MISSING_ERROR }, { status: 500 })
  }

  try {
    if (params.get("list")) {
      const url = new URL(`https://api.themoviedb.org/3/watch/providers/${type}`)
      url.searchParams.set("api_key", apiKey)
      url.searchParams.set("watch_region", COUNTRY)
      const data = await tmdbJson<{ results?: RawProvider[] }>(url)
      // TMDB's own ranking for Argentina leaves HBO Max far down the list, so the big services go first.
      const major = /^(netflix|amazon prime video|disney plus|hbo max|max|paramount plus|apple tv|mubi)$/i
      const ranked = (data?.results ?? [])
        // Skip JustWatch's own test channel and pay-per-title stores: this list is "where you stream".
        .filter((item) => !/justwatch|store$/i.test(item.provider_name))
        .map((item) => ({
          ...item,
          display_priority:
            (major.test(item.provider_name.trim()) ? 0 : 1000) +
            (item.display_priorities?.[COUNTRY] ?? item.display_priority ?? 500),
        }))
      return NextResponse.json({ providers: toProviders(ranked).slice(0, 9) })
    }

    let tmdbId = Number(params.get("id")) || null

    // Titles saved before we stored TMDB ids: look them up by title and year.
    if (!tmdbId) {
      const title = params.get("title")?.trim()
      if (!title) {
        return NextResponse.json({ error: "Falta id o title." }, { status: 400 })
      }
      const search = new URL(`https://api.themoviedb.org/3/search/${type}`)
      search.searchParams.set("api_key", apiKey)
      search.searchParams.set("query", title)
      search.searchParams.set("include_adult", "false")
      const year = Number(params.get("year"))
      if (Number.isFinite(year) && year > 1800) {
        search.searchParams.set(type === "movie" ? "year" : "first_air_date_year", String(year))
      }
      const found = await tmdbJson<{ results?: Array<{ id: number }> }>(search)
      tmdbId = found?.results?.[0]?.id ?? null
    }

    if (!tmdbId) {
      const empty: TmdbProvidersResponse = { tmdbId: null, link: null, streaming: [], rent: [], inCinemas: false }
      return NextResponse.json(empty)
    }

    const providersUrl = new URL(`https://api.themoviedb.org/3/${type}/${tmdbId}/watch/providers`)
    providersUrl.searchParams.set("api_key", apiKey)
    const releasesUrl = new URL(`https://api.themoviedb.org/3/movie/${tmdbId}/release_dates`)
    releasesUrl.searchParams.set("api_key", apiKey)

    const [data, releases] = await Promise.all([
      tmdbJson<{ results?: Record<string, RawCountryProviders> }>(providersUrl),
      type === "movie" ? tmdbJson<RawReleaseDates>(releasesUrl) : Promise.resolve(null),
    ])
    if (!data) {
      return NextResponse.json({ error: "TMDB no pudo traer las plataformas." }, { status: 502 })
    }

    const country = data.results?.[COUNTRY]
    const body: TmdbProvidersResponse = {
      tmdbId,
      link: country?.link ?? null,
      streaming: toProviders(country?.flatrate, country?.free, country?.ads),
      rent: toProviders(country?.rent, country?.buy),
      inCinemas: isInCinemas(releases),
    }
    return NextResponse.json(body)
  } catch {
    return NextResponse.json({ error: "No se pudo conectar con TMDB." }, { status: 502 })
  }
}
