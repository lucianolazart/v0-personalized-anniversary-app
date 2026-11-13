"use client"

import { useEffect } from "react"
import { doc, updateDoc } from "firebase/firestore"
import { db } from "../lib/firebase"
import type { MediaWithId } from "../types/media"
import { compareEpisodes, type SeriesInfo } from "../lib/episodes"
import { fetchSeriesInfo } from "../lib/tmdb-client"
import { seriesFields } from "../lib/media"

// Renamed when the check starts storing new data, so it runs again the day the update arrives.
const CHECK_KEY = "series-check-day-v3"
const FOLLOWED: MediaWithId["state"][] = ["in-progress", "to-resume", "up-to-date"]

function sameEpisode(a?: { season: number; episode: number }, b?: { season: number; episode: number } | null) {
  return (!a && !b) || (Boolean(a && b) && a!.season === b!.season && a!.episode === b!.episode)
}

/** True when the stored TMDB facts already match, so there is nothing to write. */
function upToDateWith(media: MediaWithId, info: SeriesInfo) {
  return (
    media.tmdbId === info.tmdbId &&
    media.tmdbType === "tv" &&
    sameEpisode(media.lastAired, info.lastAired) &&
    sameEpisode(media.nextToAir, info.nextToAir) &&
    media.nextToAir?.airDate === info.nextToAir?.airDate
  )
}

/**
 * Once a day per device, asks TMDB about every series they follow (Viendo, Por retomar, Al día):
 * - stores the latest and the next episode (poster tags, "Próximos estrenos");
 * - an "Al día" series with a released episode they haven't seen moves to "Por retomar".
 */
export function useSeriesCheck(mediaList: MediaWithId[], loading: boolean) {
  useEffect(() => {
    if (loading) return
    const today = new Date().toDateString()
    try {
      if (window.localStorage.getItem(CHECK_KEY) === today) return
      window.localStorage.setItem(CHECK_KEY, today)
    } catch {
      // Without storage the check simply runs on every visit.
    }

    const series = mediaList.filter((media) => media.type === "serie" && FOLLOWED.includes(media.state))
    if (series.length === 0) return

    // All series at once, and not tied to this screen: leaving Pelis must not cut the check short,
    // since it only runs once a day.
    void Promise.allSettled(
      series.map(async (media) => {
        try {
          const info = await fetchSeriesInfo(media)
          const ref = doc(db, "peliculas", media.id)
          const fields = seriesFields(info)

          if (media.state === "up-to-date" && info.lastAired) {
            if (!media.progress) {
              // Marked "Al día" before episodes were tracked: assume they saw everything out so far.
              await updateDoc(ref, { ...fields, progress: info.lastAired })
              return
            }
            if (compareEpisodes(media.progress, info.lastAired) < 0) {
              await updateDoc(ref, { ...fields, state: "to-resume" })
              return
            }
          }
          if (!upToDateWith(media, info)) await updateDoc(ref, fields)
        } catch (error) {
          console.error("Series check failed:", error)
        }
      })
    )
    // Runs once, when the catalog finishes loading.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading])
}
