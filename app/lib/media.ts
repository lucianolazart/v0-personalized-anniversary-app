import {
  deleteField,
  doc,
  updateDoc,
  type DocumentData,
  type UpdateData,
} from "firebase/firestore"
import { db } from "./firebase"
import type { EpisodeRef, MediaWithId } from "../types/media"
import { compareEpisodes, parseEpisodeRef, parseNextToAir, type SeriesInfo } from "./episodes"
import { parseWatchedOn } from "./watched-on"

/** Maps a `peliculas` document to a MediaWithId, ignoring malformed optional fields. */
export function mediaFromDoc(id: string, data: DocumentData): MediaWithId {
  return {
    id,
    title: data.title,
    year: data.year,
    image: data.image,
    state: data.state,
    type: data.type,
    tmdbId: typeof data.tmdbId === "number" ? data.tmdbId : undefined,
    tmdbType: data.tmdbType === "movie" || data.tmdbType === "tv" ? data.tmdbType : undefined,
    watchedOn: parseWatchedOn(data.watchedOn),
    progress: parseEpisodeRef(data.progress),
    lastAired: parseEpisodeRef(data.lastAired),
    nextToAir: parseNextToAir(data.nextToAir),
  }
}

/** TMDB facts worth keeping on the document (for labels, "Próximos estrenos" and the calendar). */
export function seriesFields(info: SeriesInfo): UpdateData<DocumentData> {
  return {
    tmdbId: info.tmdbId,
    tmdbType: "tv",
    lastAired: info.lastAired ?? deleteField(),
    nextToAir: info.nextToAir ?? deleteField(),
  }
}

/**
 * Saves how far they got in a series ("vimos hasta T10 · E4") and moves it between
 * Viendo / Al día / Vista on its own.
 */
export async function saveSeriesProgress(media: MediaWithId, progress: EpisodeRef | null, info: SeriesInfo | null) {
  const updates: UpdateData<DocumentData> = {
    progress: progress ?? deleteField(),
    ...(info ? seriesFields(info) : {}),
  }
  if (progress && info?.lastAired) {
    const ended = info.status === "Ended" || info.status === "Canceled"
    if (compareEpisodes(progress, info.lastAired) >= 0) updates.state = ended ? "watched" : "up-to-date"
    else if (media.state !== "in-progress") updates.state = "in-progress"
  }
  await updateDoc(doc(db, "peliculas", media.id), updates)
}
