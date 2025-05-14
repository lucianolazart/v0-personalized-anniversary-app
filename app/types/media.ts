export interface BaseMedia {
  id: number;
  title: string;
  year: number;
  poster: string;
  status: "watched" | "in-progress";
  notes: string;
}

export interface Movie extends Omit<BaseMedia, "id"> {
  type: "movie";
  rating: number;
  dateWatched: string;
}

export interface Series extends Omit<BaseMedia, "id"> {
  type: "series";
  currentSeason: number;
  currentEpisode: number;
  rating?: number;
  dateWatched?: string;
}

export type MediaWithId = BaseMedia & (
  | (Omit<Movie, keyof BaseMedia> & { id: number })
  | (Omit<Series, keyof BaseMedia> & { id: number })
);

export type NewMediaFormState = {
  title: string;
  type: "movie" | "series";
  year: number;
  poster: string;
  status: "watched" | "in-progress";
  notes: string;
  rating?: number;
  dateWatched?: string;
  currentSeason?: number;
  currentEpisode?: number;
}; 