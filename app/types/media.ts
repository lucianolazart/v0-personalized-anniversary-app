export interface BaseMedia {
  title: string;
  year: number;
  image: string;
  state: "watched" | "in-progress" | "pending" | "up-to-date";
  type: "pelicula" | "serie";
}

export type MediaWithId = BaseMedia & { id: string };

export type NewMediaFormState = Omit<BaseMedia, "id"> & {
  id?: string;
}; 