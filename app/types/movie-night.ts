export type MovieNightStatus = "queued" | "scheduled" | "watched"

export interface MovieNight {
  id: string
  mediaId: string
  title: string
  year: number
  image: string
  date: Date | null
  status: MovieNightStatus
}

export interface NewMovieNightFormState {
  title: string
  year: number
  image: string
  date: string
}
