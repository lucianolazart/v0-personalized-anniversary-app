import type { WatchedOn } from "./media"

export type MovieNightStatus = "queued" | "scheduled" | "watched"

export interface MovieNight {
  id: string
  mediaId: string
  title: string
  year: number
  image: string
  date: Date | null
  status: MovieNightStatus
  /** TMDB movie id, saved when the movie is picked from the TMDB search. */
  tmdbId?: number
  /** Asked when the night is marked as watched. */
  watchedOn?: WatchedOn
}

export interface NewMovieNightFormState {
  title: string
  year: number
  image: string
  date: string
  tmdbId?: number
}
