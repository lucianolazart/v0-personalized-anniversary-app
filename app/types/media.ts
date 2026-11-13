/** Where they watched it: a streaming service, at the cinema, or "pirata". */
export type WatchedOn =
  | { kind: "streaming"; providerId: number; name: string; logoUrl: string }
  | { kind: "cine" }
  | { kind: "pirata" }

/** A season/episode pair, e.g. the last episode they watched together. */
export interface EpisodeRef {
  season: number
  episode: number
}

export interface BaseMedia {
  title: string;
  year: number;
  image: string;
  /** "to-resume": a series they paused that has a new season waiting ("Por retomar"). */
  state: "watched" | "in-progress" | "pending" | "up-to-date" | "to-resume";
  type: "pelicula" | "serie";
  /** TMDB id and kind, saved when the title is picked from the TMDB search. */
  tmdbId?: number;
  tmdbType?: "movie" | "tv";
  watchedOn?: WatchedOn;
  /** Series only: the last episode they watched ("¿Por dónde van?"). */
  progress?: EpisodeRef;
  /** Series only: the latest released episode the last time we asked TMDB. */
  lastAired?: EpisodeRef;
  /** Series only: the next announced episode, shown in "Próximos estrenos" and the calendar. */
  nextToAir?: EpisodeRef & { airDate: string };
}

export type MediaWithId = BaseMedia & { id: string };

export type NewMediaFormState = Omit<BaseMedia, "id"> & {
  id?: string;
}; 