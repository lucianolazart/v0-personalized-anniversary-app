import { addDoc, collection, doc, updateDoc } from "firebase/firestore"
import { db } from "./firebase"
import type { MediaWithId } from "../types/media"

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

export function parseLocalDate(value: string) {
  const [year, month, day] = value.split("-").map(Number)
  return new Date(year, month - 1, day)
}

export function toInputDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function startOfToday() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return today
}

export function formatNightDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}
