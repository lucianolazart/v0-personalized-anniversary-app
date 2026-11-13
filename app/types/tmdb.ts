export interface TmdbSearchResult {
  id: number
  title: string
  year: number
  type: "pelicula" | "serie"
  posterUrl: string
  mediaType: "movie" | "tv"
}

export interface TmdbPoster {
  url: string
}

export interface TmdbProvider {
  id: number
  name: string
  logoUrl: string
}

export interface TmdbProvidersResponse {
  tmdbId: number | null
  /** TMDB's watch page for the title in Argentina (JustWatch data). */
  link: string | null
  /** Subscription, free or with ads. */
  streaming: TmdbProvider[]
  /** Rent or buy. */
  rent: TmdbProvider[]
  /** Movie released in theaters recently (Argentina release dates) and not out digitally yet. */
  inCinemas: boolean
}
