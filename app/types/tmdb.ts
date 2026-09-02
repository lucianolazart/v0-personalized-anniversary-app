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
