import { addDoc, collection, doc, updateDoc } from "firebase/firestore"
import { db } from "./firebase"
import { startOfToday } from "./dates"
import type { MediaWithId } from "../types/media"
import type { MovieNight } from "../types/movie-night"

function titlesMatch(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase()
}

export async function findOrCreateMovie(params: {
  catalog: MediaWithId[]
  title: string
  year: number
  image: string
}): Promise<string> {
  const match = params.catalog.find(
    (item) =>
      item.type === "pelicula" &&
      item.year === params.year &&
      titlesMatch(item.title, params.title)
  )

  if (match) {
    if (match.state !== "in-progress") {
      await updateDoc(doc(db, "peliculas", match.id), { state: "pending" })
    }
    return match.id
  }

  const created = await addDoc(collection(db, "peliculas"), {
    title: params.title,
    year: params.year,
    image: params.image,
    type: "pelicula",
    state: "pending",
  })
  return created.id
}

export {
  parseLocalDate,
  toInputDate,
  startOfToday,
  formatDisplayDate as formatNightDate,
} from "./dates"

export function nextScheduledNight(nights: MovieNight[], from = startOfToday()) {
  return nights
    .filter((night) => night.status === "scheduled" && night.date && night.date >= from)
    .sort((a, b) => (a.date?.getTime() ?? 0) - (b.date?.getTime() ?? 0))[0] ?? null
}
